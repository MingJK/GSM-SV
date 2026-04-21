import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from schemas.fw_schema import FirewallRule
from services.proxmox_client import get_proxmox_for_server
from services.network_service import allocate_random_port, manage_custom_iptables
from core.database import get_db
from models.user import User
from models.vm_port import VmPort
from api.dependencies import get_current_user, get_vm_with_owner_check


class VmPortCreate(BaseModel):
    internal_port: int
    protocol: str = "tcp"
    description: Optional[str] = None

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
    """커스텀 포트 목록 조회 (DB)"""
    vm = get_vm_with_owner_check(db, vmid, current_user)
    ports = db.query(VmPort).filter(VmPort.vm_id == vm.id).all()
    return {
        "vmid": vmid,
        "ports": [
            {
                "id": p.id,
                "internal_port": p.internal_port,
                "external_port": p.external_port,
                "protocol": p.protocol,
                "description": p.description,
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
    proxmox = get_proxmox_for_server(server)

    try:
        external_port = allocate_random_port(db)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # iptables DNAT 추가
    if vm.internal_ip:
        manage_custom_iptables(
            server=server,
            vm_ip=vm.internal_ip,
            internal_port=body.internal_port,
            external_port=external_port,
            protocol=body.protocol,
            action="ADD",
        )

    # Proxmox 방화벽 규칙 추가
    try:
        proxmox.nodes(server.name).qemu(vmid).firewall.rules.post(
            action="ACCEPT",
            type="in",
            proto=body.protocol,
            dport=str(body.internal_port),
            source="0.0.0.0/0",
            enable=1,
            comment=body.description or "",
        )
    except Exception as e:
        logger.error(f"[firewall] 커스텀 포트 Proxmox 규칙 추가 실패: {e}")

    # DB 저장
    vm_port = VmPort(
        vm_id=vm.id,
        internal_port=body.internal_port,
        external_port=external_port,
        protocol=body.protocol,
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
    """커스텀 포트 삭제 — iptables + Proxmox 방화벽 규칙 삭제 + DB 삭제"""
    vm = get_vm_with_owner_check(db, vmid, current_user)
    server = vm.server
    proxmox = get_proxmox_for_server(server)

    vm_port = db.query(VmPort).filter(VmPort.id == port_id, VmPort.vm_id == vm.id).first()
    if not vm_port:
        raise HTTPException(status_code=404, detail="포트를 찾을 수 없습니다.")

    # iptables 규칙 삭제
    if vm.internal_ip:
        manage_custom_iptables(
            server=server,
            vm_ip=vm.internal_ip,
            internal_port=vm_port.internal_port,
            external_port=vm_port.external_port,
            protocol=vm_port.protocol,
            action="DELETE",
        )

    # Proxmox 방화벽 규칙 삭제 (dport 매칭)
    try:
        rules = proxmox.nodes(server.name).qemu(vmid).firewall.rules.get()
        for rule in rules:
            if str(rule.get("dport")) == str(vm_port.internal_port) and rule.get("proto") == vm_port.protocol:
                proxmox.nodes(server.name).qemu(vmid).firewall.rules(rule["pos"]).delete()
                break
    except Exception as e:
        logger.error(f"[firewall] 커스텀 포트 Proxmox 규칙 삭제 실패: {e}")

    db.delete(vm_port)
    db.commit()
    return {"success": True, "message": f"포트 {vm_port.external_port}→{vm_port.internal_port} 삭제 완료"}
