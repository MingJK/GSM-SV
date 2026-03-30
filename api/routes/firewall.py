import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from schemas.fw_schema import FirewallRule
from services.proxmox_client import get_proxmox_for_server
from core.database import get_db
from models.user import User
from api.dependencies import get_current_user, get_vm_with_owner_check

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
