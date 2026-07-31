from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload, selectinload
from app.api import deps
from app.models.possession import (
    HandoverChecklist,
    ServiceTicket,
    TicketPriorityEnum,
    TicketStatusEnum,
)
from app.models.users import User, RoleEnum
from app.models.customers import Customer
from app.models.projects import Unit
from app.models.sales import (
    Booking,
    BookingStatusEnum,
    PaymentStatusEnum,
)
from app.services.audit import log_audit
from app.schemas.possession import (
    HandoverCreate,
    HandoverCreatedOut,
    HandoverOut,
    ServiceTicketCreate,
    ServiceTicketCreatedOut,
    ServiceTicketOut,
    ServiceTicketUpdate,
)
from app.api.query import apply_sort, paginate
from app.core.time import utcnow

router = APIRouter()

@router.post(
    "/handover",
    response_model=HandoverCreatedOut,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/handovers",
    response_model=HandoverCreatedOut,
    status_code=status.HTTP_201_CREATED,
)
def initiate_handover(
    handover_in: HandoverCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role not in [
        RoleEnum.SUPER_ADMIN,
        RoleEnum.ADMIN,
        RoleEnum.MANAGER,
    ]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    booking = (
        db.query(Booking)
        .options(
            joinedload(Booking.created_by),
            selectinload(Booking.payments),
        )
        .filter(Booking.id == handover_in.booking_id)
        .first()
    )
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current_user.role == RoleEnum.MANAGER:
        creator = booking.created_by
        if creator is None or creator.branch_id != current_user.branch_id:
            raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != BookingStatusEnum.CONFIRMED:
        raise HTTPException(
            status_code=409,
            detail="Only confirmed bookings can be handed over",
        )
    if not booking.payments or any(
        payment.status != PaymentStatusEnum.RECEIVED
        for payment in booking.payments
    ):
        raise HTTPException(
            status_code=409,
            detail="All booking payments must be received before handover",
        )
    if db.query(HandoverChecklist.id).filter(
        HandoverChecklist.booking_id == booking.id
    ).first():
        raise HTTPException(
            status_code=409,
            detail="A handover already exists for this booking",
        )

    handover = HandoverChecklist(
        booking_id=handover_in.booking_id,
        is_snagging_completed=int(handover_in.is_snagging_completed),
        keys_handed_over=int(handover_in.keys_handed_over),
        welcome_kit_provided=int(handover_in.welcome_kit_provided),
        notes=handover_in.notes,
        created_by_id=current_user.id
    )
    db.add(handover)
    db.commit()
    db.refresh(handover)
    log_audit(db, current_user.id, "POSSESSION", handover.id, "POSSESSION_COMPLETED", new_values={"booking_id": handover.booking_id})

    return {"status": "success", "handover_id": handover.id}

@router.post(
    "/tickets",
    response_model=ServiceTicketCreatedOut,
    status_code=status.HTTP_201_CREATED,
)
def create_service_ticket(
    ticket_in: ServiceTicketCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role not in {
        RoleEnum.SUPER_ADMIN,
        RoleEnum.ADMIN,
        RoleEnum.MANAGER,
        RoleEnum.EMPLOYEE,
    }:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    customer = db.query(Customer).filter(
        Customer.id == ticket_in.customer_id
    ).first()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    if (
        current_user.role == RoleEnum.EMPLOYEE
        and customer.assigned_to_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to create a ticket for this customer",
        )
    if current_user.role == RoleEnum.MANAGER:
        assigned = (
            db.get(User, customer.assigned_to_id)
            if customer.assigned_to_id
            else None
        )
        if assigned is None or assigned.branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to create a ticket for this customer",
            )
    if ticket_in.unit_id is not None:
        if db.get(Unit, ticket_in.unit_id) is None:
            raise HTTPException(status_code=404, detail="Unit not found")
        owns_unit = db.query(Booking.id).filter(
            Booking.customer_id == customer.id,
            Booking.unit_id == ticket_in.unit_id,
        ).first()
        if owns_unit is None:
            raise HTTPException(
                status_code=409,
                detail="Customer has no booking for this unit",
            )
    ticket = ServiceTicket(
        customer_id=ticket_in.customer_id,
        unit_id=ticket_in.unit_id,
        subject=ticket_in.subject,
        description=ticket_in.description,
        priority=ticket_in.priority,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    log_audit(db, current_user.id, "TICKET", ticket.id, "TICKET_CREATED", new_values={"subject": ticket.subject, "customer_id": ticket.customer_id})

    return {"status": "success", "ticket_id": ticket.id}


def get_ticket_or_404(db: Session, ticket_id: int) -> ServiceTicket:
    ticket = (
        db.query(ServiceTicket)
        .options(
            joinedload(ServiceTicket.customer).joinedload(
                Customer.assigned_to
            )
        )
        .filter(ServiceTicket.id == ticket_id)
        .first()
    )
    if ticket is None:
        raise HTTPException(status_code=404, detail="Service ticket not found")
    return ticket


def verify_ticket_access(ticket: ServiceTicket, current_user: User) -> None:
    if current_user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        return
    if current_user.role == RoleEnum.MANAGER:
        if (
            ticket.customer.assigned_to
            and ticket.customer.assigned_to.branch_id == current_user.branch_id
        ):
            return
    elif current_user.role == RoleEnum.EMPLOYEE and (
        ticket.assigned_to_id == current_user.id
        or ticket.customer.assigned_to_id == current_user.id
    ):
        return
    raise HTTPException(status_code=403, detail="Not authorized for this ticket")


@router.get("/tickets/{ticket_id}", response_model=ServiceTicketOut)
def get_service_ticket(
    ticket_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    ticket = get_ticket_or_404(db, ticket_id)
    verify_ticket_access(ticket, current_user)
    return ticket


@router.patch("/tickets/{ticket_id}", response_model=ServiceTicketOut)
def update_service_ticket(
    ticket_id: int,
    payload: ServiceTicketUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    ticket = get_ticket_or_404(db, ticket_id)
    verify_ticket_access(ticket, current_user)
    changes = payload.model_dump(exclude_unset=True)

    if "assigned_to_id" in changes and changes["assigned_to_id"] is not None:
        assignee = db.query(User).filter(
            User.id == changes["assigned_to_id"],
            User.is_active.is_(True),
            User.role.in_(
                [
                    RoleEnum.SUPER_ADMIN,
                    RoleEnum.ADMIN,
                    RoleEnum.MANAGER,
                    RoleEnum.EMPLOYEE,
                ]
            ),
        ).first()
        if assignee is None:
            raise HTTPException(status_code=404, detail="Assignee not found")
        if (
            current_user.role == RoleEnum.MANAGER
            and assignee.branch_id != current_user.branch_id
        ):
            raise HTTPException(
                status_code=403,
                detail="Cannot assign a ticket outside your branch",
            )

    if "status" in changes:
        transitions = {
            TicketStatusEnum.OPEN: {
                TicketStatusEnum.IN_PROGRESS,
                TicketStatusEnum.CLOSED,
            },
            TicketStatusEnum.IN_PROGRESS: {
                TicketStatusEnum.RESOLVED,
                TicketStatusEnum.CLOSED,
            },
            TicketStatusEnum.RESOLVED: {
                TicketStatusEnum.IN_PROGRESS,
                TicketStatusEnum.CLOSED,
            },
            TicketStatusEnum.CLOSED: set(),
        }
        if changes["status"] not in transitions[ticket.status]:
            raise HTTPException(
                status_code=409,
                detail=f"Cannot change ticket status from {ticket.status.value} to {changes['status'].value}",
            )

    old_values = {
        field: getattr(ticket, field).value
        if hasattr(getattr(ticket, field), "value")
        else getattr(ticket, field)
        for field in changes
    }
    for field, value in changes.items():
        setattr(ticket, field, value)
    if changes.get("status") == TicketStatusEnum.RESOLVED:
        ticket.resolved_at = utcnow()
    elif "status" in changes and changes["status"] != TicketStatusEnum.RESOLVED:
        ticket.resolved_at = None
    db.commit()
    db.refresh(ticket)
    log_audit(
        db,
        current_user.id,
        "TICKET",
        ticket.id,
        "TICKET_UPDATED",
        old_values=old_values,
        new_values={
            field: value.value if hasattr(value, "value") else value
            for field, value in changes.items()
        },
    )
    return ticket


@router.get("/handovers", response_model=list[HandoverOut])
def list_handovers(
    response: Response,
    booking_id: Optional[int] = None,
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(
        deps.require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER])
    ),
):
    query = db.query(HandoverChecklist)
    if current_user.role == RoleEnum.MANAGER:
        query = (
            query.join(HandoverChecklist.booking)
            .join(Booking.created_by)
            .filter(User.branch_id == current_user.branch_id)
        )
    if booking_id is not None:
        query = query.filter(HandoverChecklist.booking_id == booking_id)
    ordering = (
        HandoverChecklist.created_at.asc()
        if sort_order == "asc"
        else HandoverChecklist.created_at.desc()
    )
    query = query.order_by(ordering, HandoverChecklist.id.desc())
    items, _ = paginate(query, page=page, size=size, response=response)
    return items


@router.get("/tickets", response_model=list[ServiceTicketOut])
def list_tickets(
    response: Response,
    ticket_status: Optional[TicketStatusEnum] = Query(None, alias="status"),
    priority: Optional[TicketPriorityEnum] = None,
    assigned_to_id: Optional[int] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = db.query(ServiceTicket)
    if current_user.role == RoleEnum.EMPLOYEE:
        query = query.filter(ServiceTicket.assigned_to_id == current_user.id)
    elif current_user.role == RoleEnum.MANAGER:
        query = (
            query.join(ServiceTicket.customer)
            .join(Customer.assigned_to)
            .filter(User.branch_id == current_user.branch_id)
        )
    if ticket_status:
        query = query.filter(ServiceTicket.status == ticket_status)
    if priority:
        query = query.filter(ServiceTicket.priority == priority)
    if assigned_to_id is not None:
        query = query.filter(ServiceTicket.assigned_to_id == assigned_to_id)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            ServiceTicket.subject.ilike(term)
            | ServiceTicket.description.ilike(term)
        )
    query = apply_sort(
        query,
        model=ServiceTicket,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "created_at", "status", "priority", "subject"},
        tie_breaker=ServiceTicket.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items
