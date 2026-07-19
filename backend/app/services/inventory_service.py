from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from app.db.session import SessionLocal
from app.models.projects import Unit, UnitStatusEnum

scheduler = BackgroundScheduler()

def release_expired_holds():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        expired_units = db.query(Unit).filter(
            Unit.status == UnitStatusEnum.HOLD,
            Unit.hold_expires_at <= now
        ).all()
        
        if expired_units:
            for unit in expired_units:
                unit.status = UnitStatusEnum.AVAILABLE
                unit.hold_expires_at = None
            db.commit()
            print(f"Released {len(expired_units)} expired unit holds.")
    except Exception as e:
        print(f"Error releasing expired holds: {e}")
        db.rollback()
    finally:
        db.close()

def start_scheduler():
    # Run the job every 1 minute
    scheduler.add_job(release_expired_holds, 'interval', minutes=1, id='release_holds_job', replace_existing=True)
    scheduler.start()
    print("APScheduler started.")

def stop_scheduler():
    scheduler.shutdown()
    print("APScheduler stopped.")
