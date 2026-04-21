from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from core.database import Base


class VmPort(Base):
    __tablename__ = "vm_ports"

    id = Column(Integer, primary_key=True, index=True)
    vm_id = Column(Integer, ForeignKey("vms.id"), nullable=False, index=True)
    internal_port = Column(Integer, nullable=False)
    external_port = Column(Integer, nullable=False, unique=True)
    protocol = Column(String, default="tcp")
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
