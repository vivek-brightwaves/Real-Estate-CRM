import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles, scope_query_to_branch
from app.models.users import User, RoleEnum
from app.models.customers import Customer, CustomerDocument, DocStatusEnum
from app.models.leads import Lead, LeadStatusEnum
from app.schemas.customers import CustomerCreate, CustomerOut, CustomerDocumentOut, CustomerVerifyDocument

router = APIRouter()

def get_customer_or_404(db: Session, customer_id: int):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

def verify_customer_access(customer: Customer, current_user: User):
    if current_user.role == RoleEnum.SUPER_ADMIN:
        return
    if current_user.role == RoleEnum.MANAGER:
        pass # In a real app we'd verify the assigned user belongs to the manager's branch
    if current_user.role == RoleEnum.EMPLOYEE:
        if customer.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this customer")

@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def convert_lead_to_customer(customer_in: CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == customer_in.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
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
    return customer

@router.get("/", response_model=List[CustomerOut])
def get_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy.orm import joinedload
    # Using the same scoping logic
    query = db.query(Customer).filter(scope_query_to_branch(current_user, Customer)).options(joinedload(Customer.documents))
    return query.offset(skip).limit(limit).all()

@router.get("/verified-documents", response_model=List[CustomerDocumentOut], dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def get_verified_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns all KYC documents that have been VERIFIED, with verifier details."""
    docs = db.query(CustomerDocument).filter(
        CustomerDocument.status == DocStatusEnum.VERIFIED
    ).all()
    return docs


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    customer = get_customer_or_404(db, customer_id)
    verify_customer_access(customer, current_user)
    return customer

# We need a custom endpoint that returns the full timeline info for the frontend.
@router.get("/{customer_id}/timeline")
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

@router.post("/{customer_id}/documents", response_model=CustomerDocumentOut)
async def upload_document(
    customer_id: int, 
    doc_type: str = Form(...), 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    customer = get_customer_or_404(db, customer_id)
    verify_customer_access(customer, current_user)
    
    file_location = f"uploads/customer_{customer_id}_{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    doc = CustomerDocument(
        customer_id=customer.id,
        doc_type=doc_type,
        file_url=f"/{file_location}",
        status=DocStatusEnum.UPLOADED
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.patch("/documents/{doc_id}/verify", response_model=CustomerDocumentOut, dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def verify_document(doc_id: int, payload: CustomerVerifyDocument, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(CustomerDocument).filter(CustomerDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from datetime import datetime
    doc.status = payload.status
    if payload.status == DocStatusEnum.VERIFIED:
        doc.verified_by_id = current_user.id
        doc.verified_at = datetime.utcnow()
    else:
        # If rejected/reverted, clear verification metadata
        doc.verified_by_id = None
        doc.verified_at = None

    db.commit()
    db.refresh(doc)
    return doc

