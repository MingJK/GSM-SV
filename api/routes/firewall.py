import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, field_validator
from typing import Optional
from sqlalchemy.orm import Session
from schemas.fw_schema import FirewallRule
from services.proxmox_client import get_proxmox_for_server
from services.network_service import allocate_random_port, manage_custom_iptables, calculate_ports
from core.database import get_db
from models.user import User
from models.vm_port import VmPort
from api.dependencies import get_current_user, get_vm_with_owner_check


class VmPortCreate(BaseModel):
    internal_port: int
    protocol: str = "tcp"
    action: str = "ACCEPT"
    source: Optional[str] = None
    description: Optional[str] = None

    @field_validator("protocol")
    @classmethod
    def validate_protocol(cls, v: str) -> str:
        if v not in ("tcp", "udp"):
            raise ValueError("프로토콜은 tcp 또는 udp만 허용됩니다.")
        return v

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v not in ("ACCEPT", "DROP"):
            raise ValueError("액션은 ACCEPT 또는 DROP만 허용됩니다.")
        return v

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{vmid}/rules")
async def get_firewall_rules(
    vmid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 VM의 방화벽 규칙 목록 조회 (소유자 또는 관리자)"""
    vm = get_vm_with_owner_check(db, vmid, current_user)
    server = vm.server
    proxmox = get_proxmox_for_server(server)

    try:
        rules = proxmox.nodes(server.name).qemu(vmid).firewall.rules.get()
        return {"vmid": vmid, "node": server.name, "rules": rules}
    except Exception as e:
        logger.error(f"[firewall] 규칙 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="방화벽 규칙 조회에 실패했습니다.")


@router.post("/{vmid}/rules")
async def add_firewall_rule(
    vmid: int,
    rule: FirewallRule,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 VM에 방화벽 규칙 추가 (소유자 또는 관리자)"""
    vm = get_vm_with_owner_check(db, vmid, current_user)
    server = vm.server
    proxmox = get_proxmox_for_server(server)

    try:
        rule_data = rule.model_dump(exclude_none=True)
        if vm.internal_ip:
            rule_data["dest"] = vm.internal_ip
        proxmox.nodes(server.name).qemu(vmid).firewall.rules.post(**rule_data)
        proxmox.nodes(server.name).qemu(vmid).firewall.options.put(enable=1)
        return {"success": True, "message": f"VM {vmid} 방화벽 규칙 추가 완료", "rule": rule_data}
    except Exception as e:
        logger.error(f"[firewall] 규칙 추가 실패: {e}")
        raise HTTPException(status_code=500, detail="방화벽 규칙 추가에 실패했습니다.")


@router.delete("/{vmid}/rules/{pos}")
async def delete_firewall_rule(
    vmid: int,
    pos: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """특정 VM의 방화벽 규칙 삭제 (소유자 또는 관리자)"""
    vm = get_vm_with_owner_check(db, vmid, current_user)
    server = vm.server
    proxmox = get_proxmox_for_server(server)

    try:
        proxmox.nodes(server.name).qemu(vmid).firewall.rules(pos).delete()
        return {"success": True, "message": f"VM {vmid} 방화벽 규칙({pos}번) 삭제 완료"}
    except Exception as e:
        logger.error(f"[firewall] 규칙 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail="방화벽 규칙 삭제에 실패했습니다.")


# ── 커스텀 포트 할당 (30000~39999) ───────────────────────────────────────────

@router.get("/{vmid}/ports")
async def get_custom_ports(
    vmid: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """커스텀 포트 목록 조회 (DB) — 기본 포트 레코드가 없으면 자동 생성"""
    vm = get_vm_with_owner_check(db, vmid, current_user)

    has_defaults = db.query(VmPort).filter(VmPort.vm_id == vm.id, VmPort.is_default == True).first()  # noqa: E712
    if not has_defaults:
        server = vm.server
        default_port_map = calculate_ports(server.base_port, vmid)
        for internal_port, protocol, description, external_port in [
            (22,    "tcp",     "SSH",  default_port_map["ssh"]),
            (80,    "tcp",     "HTTP", default_port_map["svc1"]),
            (10000, "tcp/udp", "SVC",  default_port_map["svc2"]),
        ]:
            db.add(VmPort(
                vm_id=vm.id,
                internal_port=internal_port,
                external_port=external_port,
                protocol=protocol,
                action="ACCEPT",
                source="0.0.0.0/0",
                description=description,
                is_default=True,
            ))
        try:
            db.commit()
        except Exception:
            db.rollback()

    ports = db.query(VmPort).filter(VmPort.vm_id == vm.id).all()
    return {
        "vmid": vmid,
        "ports": [
            {
                "id": p.id,
                "internal_port": p.internal_port,
                "external_port": p.external_port,
                "protocol": p.protocol,
                "action": p.action,
                "source": p.source,
                "description": p.description,
                "is_default": p.is_default,
            }
            for p in ports
        ],
    }


@router.post("/{vmid}/ports")
async def add_custom_port(
    vmid: int,
    body: VmPortCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """커스텀 포트 추가 — 30000~39999 랜덤 외부 포트 할당 + iptables + Proxmox 방화벽 규칙"""
    vm = get_vm_with_owner_check(db, vmid, current_user)
    server = vm.server

    custom_count = db.query(VmPort).filter(VmPort.vm_id == vm.id, VmPort.is_default == False).count()  # noqa: E712
    if custom_count >= 30:
        raise HTTPException(status_code=409, detail="VM당 커스텀 포트는 최대 30개까지 추가할 수 있습니다.")

    try:
        external_port = allocate_random_port(db)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # iptables DNAT 추가 — 실패 시 DB 저장 중단
    if vm.internal_ip:
        success = manage_custom_iptables(
            server=server,
            vm_ip=vm.internal_ip,
            internal_port=body.internal_port,
            external_port=external_port,
            protocol=body.protocol,
            action="ADD",
        )
        if not success:
            raise HTTPException(status_code=502, detail="Gateway 방화벽 규칙 설정에 실패했습니다.")

    # DB 저장
    vm_port = VmPort(
        vm_id=vm.id,
        internal_port=body.internal_port,
        external_port=external_port,
        protocol=body.protocol,
        action=body.action,
        source=body.source,
        description=body.description,
    )
    db.add(vm_port)
    db.commit()
    db.refresh(vm_port)

    return {
        "id": vm_port.id,
        "internal_port": vm_port.internal_port,
        "external_port": vm_port.external_port,
        "protocol": vm_port.protocol,
        "description": vm_port.description,
    }


@router.delete("/{vmid}/ports/{port_id}")
async def delete_custom_port(
    vmid: int,
    port_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """커스텀 포트 삭제 — iptables 제거 + DB 삭제"""
    vm = get_vm_with_owner_check(db, vmid, current_user)
    server = vm.server

    vm_port = db.query(VmPort).filter(VmPort.id == port_id, VmPort.vm_id == vm.id).first()
    if not vm_port:
        raise HTTPException(status_code=404, detail="포트를 찾을 수 없습니다.")

    # iptables 규칙 삭제 ("tcp/udp" 프로토콜은 두 번 호출)
    # 실패해도 DB 레코드는 삭제 — 삭제 실패 시 영구적으로 못 지우는 것이 더 위험
    if vm.internal_ip:
        protocols = ["tcp", "udp"] if vm_port.protocol == "tcp/udp" else [vm_port.protocol]
        for proto in protocols:
            success = manage_custom_iptables(
                server=server,
                vm_ip=vm.internal_ip,
                internal_port=vm_port.internal_port,
                external_port=vm_port.external_port,
                protocol=proto,
                action="DELETE",
            )
            if not success:
                logger.error(f"[firewall] Gateway iptables 삭제 실패 — port {vm_port.external_port} ({proto}), DB 레코드는 삭제 진행")

    db.delete(vm_port)
    db.commit()
    return {"success": True, "message": f"포트 {vm_port.external_port}→{vm_port.internal_port} 삭제 완료"}
