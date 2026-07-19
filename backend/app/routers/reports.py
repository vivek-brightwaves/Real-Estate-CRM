from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from io import BytesIO
import openpyxl

from app.db.session import get_db
from app.api.deps import get_current_user, require_roles, scope_query_to_branch
from app.models.users import User, RoleEnum
from app.models.sales import Payment, Booking, PaymentStatusEnum
from app.models.leads import Lead
from app.models.projects import Unit

router = APIRouter()

def get_report_data(report_type: str, db: Session, current_user: User):
    if report_type == "finance":
        query = db.query(Payment)
        if current_user.role == RoleEnum.MANAGER:
            branch_users = db.query(User.id).filter(User.branch_id == current_user.branch_id).all()
            branch_user_ids = [u.id for u in branch_users]
            query = query.join(Booking).filter(Booking.created_by_id.in_(branch_user_ids))
        
        payments = query.all()
        data = [["Payment ID", "Booking ID", "Amount", "Status", "Received Date", "Mode"]]
        for p in payments:
            data.append([p.id, p.booking_id, p.amount, p.status.value, str(p.received_date or ""), p.mode.value if p.mode else ""])
        return data
        
    elif report_type == "sales":
        query = db.query(Booking)
        if current_user.role == RoleEnum.MANAGER:
            branch_users = db.query(User.id).filter(User.branch_id == current_user.branch_id).all()
            branch_user_ids = [u.id for u in branch_users]
            query = query.filter(Booking.created_by_id.in_(branch_user_ids))
            
        bookings = query.all()
        data = [["Booking ID", "Unit ID", "Customer ID", "Status", "Created By ID"]]
        for b in bookings:
            data.append([b.id, b.unit_id, b.customer_id, b.status.value, b.created_by_id])
        return data
        
    elif report_type == "inventory":
        units = db.query(Unit).all()
        data = [["Unit ID", "Block ID", "Type", "Area", "Price", "Status"]]
        for u in units:
            data.append([u.id, u.block_id, u.type, u.area, u.price, u.status.value])
        return data
        
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

@router.get("/{report_type}", dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def preview_report(report_type: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = get_report_data(report_type, db, current_user)
    # Return first 50 rows for preview
    return {"headers": data[0], "rows": data[1:51], "total_rows": len(data) - 1}

@router.get("/{report_type}/export", dependencies=[Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.MANAGER]))])
def export_report(report_type: str, format: str = "excel", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = get_report_data(report_type, db, current_user)
    
    if format == "excel":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = f"{report_type.capitalize()} Report"
        
        for row in data:
            ws.append(row)
            
        file_stream = BytesIO()
        wb.save(file_stream)
        file_stream.seek(0)
        
        return StreamingResponse(
            file_stream, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report.xlsx"}
        )
    elif format == "pdf":
        # Using reportlab here as per earlier setup
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        from reportlab.lib import colors
        
        file_stream = BytesIO()
        pdf = SimpleDocTemplate(file_stream, pagesize=letter)
        
        # Create table (handle long data gracefully in a real app, here just standard table)
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        pdf.build([table])
        file_stream.seek(0)
        
        return StreamingResponse(
            file_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report.pdf"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Choose excel or pdf.")
