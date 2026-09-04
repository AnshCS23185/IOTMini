from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")
    users = relationship("User", back_populates="role_rel")

class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)

    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")

class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)

class UserSite(Base):
    __tablename__ = "user_sites"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    site_id = Column(Integer, ForeignKey("solar_sites.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False, index=True)
    target_type = Column(String, nullable=True)
    target_id = Column(Integer, nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    site_id = Column(Integer, ForeignKey("solar_sites.id", ondelete="SET NULL"), nullable=True)
    result = Column(String, nullable=False) # e.g., "SUCCESS", "FAILURE", "DENIED"
    details = Column(Text, nullable=True)
