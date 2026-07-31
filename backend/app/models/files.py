from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.db.base import Base


class FileUpload(Base):
    __tablename__ = "file_uploads"

    id = Column(Integer, primary_key=True, index=True)
    original_name = Column(String(500), nullable=False)
    stored_name = Column(String(500), nullable=False, unique=True)
    file_path = Column(String(1000), nullable=False)
    mime_type = Column(String(200), nullable=True)
    size_bytes = Column(Integer, nullable=False)
    module = Column(String(100), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
