"""
SQLAlchemy User model for authentication.
"""

from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.models.database import Base


class User(Base):
    """
    User model for storing user credentials and metadata.
    
    Fields:
    - id: Primary key (username)
    - username: Unique username for login
    - password_hash: Bcrypt hashed password (never stored in plain text)
    - created_at: Account creation timestamp
    - updated_at: Last update timestamp
    - is_active: Whether account is active
    """
    
    __tablename__ = "users"
    
    username = Column(String(255), primary_key=True, unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    def __repr__(self) -> str:
        return f"<User(username={self.username}, is_active={self.is_active})>"
