from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Literal, Optional
from app.api import deps
from app.models.partners import Broker
from app.models.users import User, RoleEnum
from app.schemas.partners import BrokerCreate, BrokerCreateOut, BrokerListOut
from app.services.audit import log_audit

router = APIRouter(
    dependencies=[
        Depends(deps.require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN, RoleEnum.MANAGER]))
    ]
)

@router.post("", response_model=BrokerCreateOut, status_code=201)
def register_broker(
    broker_in: BrokerCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    broker = Broker(**broker_in.model_dump())
    db.add(broker)
    db.commit()
    db.refresh(broker)
    log_audit(
        db,
        current_user.id,
        "PARTNER",
        broker.id,
        "CREATE",
        new_values={"name": broker.name, "company_name": broker.company_name},
    )
    return {"status": "success", "broker": {"id": broker.id, "name": broker.name}}

@router.get("", response_model=BrokerListOut)
def list_brokers(
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    is_active: Optional[bool] = None,
    sort_order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    query = db.query(Broker)
    if is_active is not None:
        query = query.filter(Broker.is_active == is_active)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            Broker.name.ilike(term) | Broker.company_name.ilike(term)
        )
    total = query.count()
    ordering = Broker.name.asc() if sort_order == "asc" else Broker.name.desc()
    brokers = (
        query.order_by(ordering, Broker.id.asc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return {
        "status": "success",
        "total": total,
        "page": page,
        "size": size,
        "brokers": [
            {"id": broker.id, "name": broker.name, "company": broker.company_name}
            for broker in brokers
        ],
    }
