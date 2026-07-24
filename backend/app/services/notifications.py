import json
import smtplib
from email.mime.text import MIMEText
from sqlalchemy.orm import Session
from app.models.system import Notification
from app.models.users import User, Company

def send_notification(db: Session, user_id: int, notif_type: str, message: str, email_subject: str = None):
    """
    Creates an in-app notification and dispatches external alerts based on Company settings.
    Errors in email/SMS dispatch are caught and logged — they never propagate to the caller.
    """
    # 1. Create In-App Notification (always saved, regardless of email/SMS outcome)
    notification = Notification(
        user_id=user_id,
        type=notif_type,
        message=message
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    try:
        # 2. Fetch User and Company Settings
        user = db.query(User).filter(User.id == user_id).first()
        company = db.query(Company).first()
        
        if not user or not company:
            return notification

        # settings_json is stored as a raw JSON string in the DB — parse it safely
        raw = company.settings_json
        if isinstance(raw, str):
            try:
                settings = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                settings = {}
        elif isinstance(raw, dict):
            settings = raw
        else:
            settings = {}

        # 3. Handle Email Dispatch (if configured)
        email_settings = settings.get("email", {})
        if email_settings.get("enabled") and user.email and email_subject:
            try:
                msg = MIMEText(message)
                msg['Subject'] = email_subject
                msg['From'] = email_settings.get("sender_email", "noreply@crm.local")
                msg['To'] = user.email
                
                with smtplib.SMTP(email_settings.get("host", "localhost"), int(email_settings.get("port", 25))) as server:
                    if email_settings.get("use_tls"):
                        server.starttls()
                    if email_settings.get("username"):
                        server.login(email_settings["username"], email_settings.get("password", ""))
                    server.send_message(msg)
            except Exception as e:
                print(f"Failed to send email to {user.email}: {e}")
                
        # 4. Handle SMS/WhatsApp Dispatch (mocked)
        msg_settings = settings.get("messaging", {})
        if msg_settings.get("enabled") and user.phone:
            provider = msg_settings.get("provider", "Twilio")
            print(f"[MOCK {provider}] Sending SMS to {user.phone}: {message}")

    except Exception as e:
        # Never let notification dispatch crash the calling endpoint
        print(f"[send_notification] Non-critical error during dispatch: {e}")
        
    return notification
