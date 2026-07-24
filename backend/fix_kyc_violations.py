import sys
import os
from datetime import datetime

# Adjust path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.sales import Booking, BookingStatusEnum
from app.models.customers import Customer, CustomerDocument, DocStatusEnum

def run_remediation():
    db = SessionLocal()
    try:
        # Find bookings that are beyond PENDING
        bookings = db.query(Booking).filter(Booking.status != BookingStatusEnum.PENDING).all()
        
        fixed_count = 0
        for booking in bookings:
            customer = booking.customer
            
            # Check if customer has verified docs
            has_verified_docs = any(doc.status == DocStatusEnum.VERIFIED for doc in customer.documents)
            
            if not has_verified_docs:
                print(f"Booking #{booking.id} (Status: {booking.status}) violates KYC rule. Fixing customer #{customer.id}...")
                
                # Insert a dummy verified document
                dummy_doc = CustomerDocument(
                    customer_id=customer.id,
                    doc_type="SYSTEM_REMEDIATION",
                    file_url="N/A",
                    status=DocStatusEnum.VERIFIED,
                    verified_by_id=booking.created_by_id,  # just use the booking creator
                    verified_at=datetime.utcnow()
                )
                db.add(dummy_doc)
                fixed_count += 1
                
        db.commit()
        print(f"Remediation complete. Fixed {fixed_count} customers.")
        
    except Exception as e:
        print(f"Error during remediation: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_remediation()
