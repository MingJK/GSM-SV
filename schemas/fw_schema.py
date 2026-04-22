import ipaddress
from pydantic import BaseModel, field_validator, Field
from typing import Optional


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
    action: str = "ACCEPT"  # ACCEPT, DROP, REJECT
    type: str = "in"        # in (인바운드), out (아웃바운드)
    proto: Optional[str] = "tcp" # tcp, udp, icmp 등
    dport: Optional[str] = None  # 목적지 포트 (예: "80", "443", "22")
    dest: Optional[str] = None   # 목적지 IP
    source: Optional[str] = None # 출발지 IP (예: 192.168.1.0/24)
    enable: int = 1         # 1: 활성, 0: 비활성
    comment: Optional[str] = None
