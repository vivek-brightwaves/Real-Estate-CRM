import os
import re
import uuid
from pathlib import Path
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, UploadFile, File, Form
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.query import apply_sort, paginate
from app.db.session import get_db
from app.api.deps import get_current_user, require_roles
from app.models.users import User, RoleEnum
from app.models.customers import Customer, CustomerDocument, DocStatusEnum
from app.models.leads import Lead, LeadStatusEnum
from app.schemas.customers import (
    CustomerCreate,
    CustomerDocumentOut,
    CustomerOut,
    CustomerUpdate,
    CustomerTimelineOut,
    CustomerVerifyDocument,
)
from app.services.audit import log_audit
from app.core.time import utcnow

CRM_STAFF_ROLES = [
    RoleEnum.SUPER_ADMIN,
    RoleEnum.ADMIN,
    RoleEnum.MANAGER,
    RoleEnum.EMPLOYEE,
]
router = APIRouter(
    dependencies=[Depends(require_roles(CRM_STAFF_ROLES))]
)

def get_customer_or_404(db: Session, customer_id: int):
    customer = (
        db.query(Customer)
        .options(
            joinedload(Customer.assigned_to),
            joinedload(Customer.lead).selectinload(Lead.notes),
            joinedload(Customer.lead).selectinload(Lead.site_visits),
            selectinload(Customer.documents).joinedload(
                CustomerDocument.verified_by
            ),
        )
        .filter(Customer.id == customer_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

def verify_customer_access(customer: Customer, current_user: User):
    if current_user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        return
    if current_user.role == RoleEnum.MANAGER:
        assigned_user = customer.assigned_to
        if (
            assigned_user is None
            or assigned_user.branch_id != current_user.branch_id
        ):
            raise HTTPException(
                status_code=403,
                detail="Not authorized to access this customer",
            )
        return
    if current_user.role == RoleEnum.EMPLOYEE:
        if customer.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this customer")


def verify_lead_conversion_access(lead: Lead, current_user: User) -> None:
    if current_user.role in [RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]:
        return
    if current_user.branch is None:
        raise HTTPException(status_code=403, detail="User has no assigned branch")
    if lead.company_id != current_user.branch.company_id:
        raise HTTPException(status_code=403, detail="Not authorized to convert this lead")
    if (
        current_user.role == RoleEnum.EMPLOYEE
        and lead.assigned_to_id != current_user.id
        and lead.created_by_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not authorized to convert this lead")

@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def convert_lead_to_customer(customer_in: CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == customer_in.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    verify_lead_conversion_access(lead, current_user)

    # Check if a customer already exists for this lead
    existing_customer = db.query(Customer).filter(Customer.lead_id == lead.id).first()
    if existing_customer:
        raise HTTPException(status_code=400, detail="Customer already exists for this lead")

    lead.status = LeadStatusEnum.CONVERTED

    customer = Customer(
        name=customer_in.name,
        phone=customer_in.phone or lead.phone,
        email=customer_in.email or lead.email,
        lead_id=lead.id,
        assigned_to_id=lead.assigned_to_id
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    log_audit(db, current_user.id, "CUSTOMER", customer.id, "CREATE", new_values={"name": customer.name, "lead_id": lead.id})
    return customer

@router.get("", response_model=List[CustomerOut])
def get_customers(
    response: Response,
    assigned_to_id: Optional[int] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    sort_by: str = "id",
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Customer)
        .options(
            selectinload(Customer.documents).joinedload(
                CustomerDocument.verified_by
            )
        )
    )
    if current_user.role == RoleEnum.EMPLOYEE:
        query = query.filter(Customer.assigned_to_id == current_user.id)
    elif current_user.role == RoleEnum.MANAGER:
        query = query.join(Customer.assigned_to).filter(
            User.branch_id == current_user.branch_id
        )
    if assigned_to_id is not None:
        query = query.filter(Customer.assigned_to_id == assigned_to_id)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Customer.name.ilike(term),
                Customer.email.ilike(term),
                Customer.phone.ilike(term),
            )
        )
    query = apply_sort(
        query,
        model=Customer,
        sort_by=sort_by,
        sort_order=sort_order,
        allowed_fields={"id", "name", "email"},
        tie_breaker=Customer.id,
    )
    items, _ = paginate(query, page=page, size=size, response=response)
    return items

@router.get("/verified-documents", response_model=List[CustomerDocumentOut], dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def get_verified_documents(
    response: Response,
    doc_type: Optional[str] = Query(None, max_length=50),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all KYC documents that have been VERIFIED, with verifier details."""
    query = (
        db.query(CustomerDocument)
        .options(joinedload(CustomerDocument.verified_by))
        .filter(CustomerDocument.status == DocStatusEnum.VERIFIED)
    )
    if current_user.role == RoleEnum.MANAGER:
        query = (
            query.join(CustomerDocument.customer)
            .join(Customer.assigned_to)
            .filter(User.branch_id == current_user.branch_id)
        )
    if doc_type:
        query = query.filter(CustomerDocument.doc_type == doc_type)
    total = query.count()
    docs = (
        query.order_by(CustomerDocument.verified_at.desc(), CustomerDocument.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(size)
    return docs


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    customer = get_customer_or_404(db, customer_id)
    verify_customer_access(customer, current_user)
    return customer


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = get_customer_or_404(db, customer_id)
    verify_customer_access(customer, current_user)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return customer
    old_values = {key: getattr(customer, key) for key in updates}
    for key, value in updates.items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    log_audit(
        db,
        current_user.id,
        "CUSTOMER",
        customer.id,
        "UPDATE",
        old_values=old_values,
        new_values=updates,
    )
    return customer


# We need a custom endpoint that returns the full timeline info for the frontend.
@router.get("/{customer_id}/timeline", response_model=CustomerTimelineOut)
def get_customer_timeline(customer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    customer = get_customer_or_404(db, customer_id)
    verify_customer_access(customer, current_user)

    timeline = []

    if customer.lead:
        timeline.append({
            "type": "LEAD_CREATED",
            "date": customer.lead.created_at,
            "title": "Lead Created",
            "description": f"Source: {customer.lead.source}"
        })

        for note in customer.lead.notes:
            timeline.append({
                "type": "NOTE",
                "date": note.created_at,
                "title": "Note Added",
                "description": note.note
            })

        for visit in customer.lead.site_visits:
            timeline.append({
                "type": "SITE_VISIT",
                "date": visit.scheduled_at,
                "title": "Site Visit",
                "description": f"Status: {visit.status}. Feedback: {visit.feedback or 'None'}"
            })

    # Sort timeline chronologically
    timeline.sort(key=lambda x: x["date"], reverse=True)
    return {"timeline": timeline}

@router.post(
    "/{customer_id}/documents",
    response_model=CustomerDocumentOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    customer_id: int,
    doc_type: str = Form(
        ...,
        min_length=1,
        max_length=50,
        pattern=r"^[A-Za-z0-9_-]+$",
    ),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = get_customer_or_404(db, customer_id)
    verify_customer_access(customer, current_user)

    from app.routers.files import MAX_FILE_SIZE, validate_file

    validate_file(file)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024 * 1024)} MB",
        )

    original_name = file.filename or "document"
    _, extension = os.path.splitext(original_name)
    safe_stem = re.sub(r"[^A-Za-z0-9_-]", "_", os.path.splitext(original_name)[0])
    safe_name = f"{safe_stem[:80]}_{uuid.uuid4().hex}{extension.lower()}"
    file_location = os.path.join("uploads", f"customer_{customer_id}_{safe_name}")
    os.makedirs(os.path.dirname(file_location), exist_ok=True)
    with open(file_location, "wb") as file_object:
        file_object.write(content)

    doc = CustomerDocument(
        customer_id=customer.id,
        doc_type=doc_type,
        file_url=f"/{Path(file_location).as_posix()}",
        status=DocStatusEnum.UPLOADED
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    log_audit(db, current_user.id, "CUSTOMER", customer.id, "KYC_UPLOAD", new_values={"doc_id": doc.id, "doc_type": doc_type, "file": file.filename})
    return doc

@router.patch("/documents/{doc_id}/verify", response_model=CustomerDocumentOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))])
def verify_document(doc_id: int, payload: CustomerVerifyDocument, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = (
        db.query(CustomerDocument)
        .options(
            joinedload(CustomerDocument.customer).joinedload(
                Customer.assigned_to
            )
        )
        .filter(CustomerDocument.id == doc_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    verify_customer_access(doc.customer, current_user)

    doc.status = payload.status
    if payload.status == DocStatusEnum.VERIFIED:
        doc.verified_by_id = current_user.id
        doc.verified_at = utcnow()
    else:
        # If rejected/reverted, clear verification metadata
        doc.verified_by_id = None
        doc.verified_at = None

    db.commit()
    db.refresh(doc)
    action = "KYC_APPROVAL" if payload.status == DocStatusEnum.VERIFIED else "KYC_REJECTION"
    log_audit(db, current_user.id, "CUSTOMER", doc.customer_id, action, new_values={"doc_id": doc.id, "status": payload.status.value})
    return doc

