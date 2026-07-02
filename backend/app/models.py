from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from app.database import Base

def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name     = Column(String, nullable=True)
    created_at    = Column(String, nullable=False, default=now_utc)

class Bookmark(Base):
    __tablename__ = "bookmarks"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    proceso_id = Column(String, nullable=False)   # = id_del_proceso de SECOP
    titulo     = Column(String, nullable=True)    # snapshot
    entidad    = Column(String, nullable=True)    # snapshot
    estado     = Column(String, nullable=True)    # snapshot
    url        = Column(String, nullable=True)    # snapshot
    created_at = Column(String, nullable=False, default=now_utc)
    __table_args__ = (UniqueConstraint("user_id", "proceso_id"),)

class SavedSearch(Base):
    __tablename__ = "saved_searches"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    name         = Column(String, nullable=False)
    filters_json = Column(String, nullable=False)  # JSON serializado
    created_at   = Column(String, nullable=False, default=now_utc)