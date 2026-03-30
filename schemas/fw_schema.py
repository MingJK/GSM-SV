from pydantic import BaseModel
from typing import Optional

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
