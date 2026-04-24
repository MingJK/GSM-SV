import ipaddress
import re
from pydantic import BaseModel, field_validator, Field
from typing import Literal, Optional


class VmPortCreate(BaseModel):
    internal_port: int = Field(..., ge=1, le=65535)
    protocol: str = "tcp"
    source: Optional[str] = None
    description: Optional[str] = None

    @field_validator("protocol")
    @classmethod
    def validate_protocol(cls, v: str) -> str:
        if v not in ("tcp", "udp"):
            raise ValueError("프로토콜은 tcp 또는 udp만 허용됩니다.")
        return v

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        try:
            ipaddress.ip_network(v, strict=False)
        except ValueError:
            raise ValueError("올바른 IP 또는 CIDR 형식이어야 합니다. (예: 192.168.1.0/24)")
        return v


class FirewallRule(BaseModel):
    """방화벽 규칙 생성/수정 모델"""
    action: Literal["ACCEPT", "DROP", "REJECT"] = "ACCEPT"
    type: Literal["in", "out"] = "in"
    proto: Optional[Literal["tcp", "udp", "icmp"]] = "tcp"
    dport: Optional[str] = None
    dest: Optional[str] = None
    source: Optional[str] = None
    enable: int = 1
    comment: Optional[str] = None

    @field_validator("dport")
    @classmethod
    def validate_dport(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        pattern = r"^\d{1,5}([:,]\d{1,5})*$"
        if not re.match(pattern, v):
            raise ValueError("포트는 숫자, 콤마, 콜론으로 구성된 형식만 허용됩니다")
        return v
