import logging
import string
import secrets
import time
import paramiko
from datetime import datetime, timedelta, timezone
from core.timezone import now_kst

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from core.config import settings
from core.constants import TIER_SPECS
from models.vm import Vm
from models.server import Server
from models.user import User, UserRole
from services.proxmox_client import get_proxmox_for_server
from services.network_service import manage_iptables
from models.notification import Notification

logger = logging.getLogger(__name__)

# ── 헬퍼 함수 ──────────────────────────────────────────────

def _generate_password(length: int = 8) -> str:
    """영문+숫자+특수문자 랜덤 비밀번호 생성"""
    chars = string.ascii_letters + string.digits + "!@#$%&*"
    password = ''.join(secrets.choice(chars) for _ in range(length))
    # 최소 조건 보장 (영문 + 숫자 + 특수문자 각 1개 이상)
    if not (any(c in string.ascii_letters for c in password)
            and any(c in string.digits for c in password)
            and any(c in "!@#$%&*" for c in password)):
        return _generate_password(length)
    return password


def _generate_vm_name(user: User, tier: str, custom_name: str = None) -> tuple[str, str]:
    """
    VM 이름 생성 → (proxmox_name, display_name) 튜플 반환
    - custom_name이 있으면: test1-myvm / myvm
    - 없으면 자동 생성:    test1-micro-a3f2 / micro-a3f2
    """
    username = user.email.split("@")[0]
    if custom_name:
        return f"{username}-{custom_name}", custom_name
    suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(4))
    short = f"{tier}-{suffix}"
    return f"{username}-{short}", short


def _get_next_vmid(proxmox, node_name: str) -> int:
    """Proxmox 클러스터에서 사용 가능한 다음 VMID를 가져옵니다."""
    try:
        return int(proxmox.cluster.nextid.get())
    except Exception:
        vms = proxmox.nodes(node_name).qemu.get()
        if not vms:
            return 100
        max_id = max(vm.get('vmid', 100) for vm in vms)
        return max_id + 1


def _allocate_internal_ip(db: Session) -> str:
    """
    DB에서 사용 중인 internal_ip를 조회하고,
    10.0.0.100 ~ 10.0.0.254 범위에서 빈 IP를 반환합니다.
    """
    used_ips = {
        vm.internal_ip
        for vm in db.query(Vm.internal_ip).filter(Vm.internal_ip.isnot(None)).all()
    }

    prefix = settings.INTERNAL_SUBNET
    for octet in range(settings.INTERNAL_IP_START, settings.INTERNAL_IP_END + 1):
        candidate = f"{prefix}.{octet}"
        if candidate not in used_ips:
            return candidate

    raise HTTPException(
        status_code=status.HTTP_507_INSUFFICIENT_STORAGE,
        detail="할당 가능한 내부 IP가 없습니다. 관리자에게 문의하세요.",
    )


SNIPPETS_DIR = "/var/lib/vz/snippets"


def _generate_userdata_yaml(password: str, root_password: str = "") -> str:
    """VM별 동적 cloud-init user-data YAML을 생성합니다."""
    return f"""#cloud-config
preserve_hostname: false
hostname: gsmsv
ssh_pwauth: true
users:
  - name: ubuntu
    plain_text_passwd: "{password}"
    lock_passwd: false
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
write_files:
  - path: /etc/netplan/99-mtu.yaml
    content: |
      network:
        version: 2
        ethernets:
          eth0:
            mtu: 1400
    permissions: '0644'
runcmd:
  - ip link set dev eth0 mtu 1400
  - netplan apply
  - echo "root:{root_password}" | chpasswd
  - echo -e "PasswordAuthentication yes\\nPermitRootLogin no" > /etc/ssh/sshd_config.d/60-cloudimg-settings.conf
  - systemctl restart ssh
  - apt update
  - apt install -y qemu-guest-agent
  - systemctl enable --now qemu-guest-agent
  - touch /etc/cloud/cloud-init.disabled
  - echo "CLOUD-INIT SUCCESS" > /home/ubuntu/ok.txt
"""


def _upload_snippet(server: Server, filename: str, content: str):
    """SSH/SFTP로 Proxmox 노드에 스니펫 파일을 업로드합니다."""
    if not server.ssh_user:
        raise RuntimeError(f"서버 {server.name}에 SSH 계정이 설정되지 않았습니다.")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.WarningPolicy())
    try:
        ssh.connect(
            hostname=server.ip_address,
            port=server.ssh_port or 22,
            username=server.ssh_user,
            password=server.ssh_password,
            timeout=10,
        )
        sftp = ssh.open_sftp()
        remote_path = f"{SNIPPETS_DIR}/{filename}"
        with sftp.file(remote_path, "w") as f:
            f.write(content)
        sftp.close()
        logger.info(f"스니펫 업로드 완료: {server.name}:{remote_path}")
    finally:
        ssh.close()


def _delete_snippet(server: Server, filename: str):
    """SSH로 Proxmox 노드에서 스니펫 파일을 삭제합니다."""
    if not server.ssh_user:
        return

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.WarningPolicy())
    try:
        ssh.connect(
            hostname=server.ip_address,
            port=server.ssh_port or 22,
            username=server.ssh_user,
            password=server.ssh_password,
            timeout=10,
        )
        remote_path = f"{SNIPPETS_DIR}/{filename}"
        ssh.exec_command(f"rm -f {remote_path}")
        logger.info(f"스니펫 삭제 완료: {server.name}:{remote_path}")
    except Exception as e:
        logger.warning(f"스니펫 삭제 실패 (무시): {e}")
    finally:
        ssh.close()


def _wait_for_clone(proxmox, node_name: str, vmid: int, timeout: int = 60):
    """클론 태스크가 완료될 때까지 대기합니다."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            # VM config를 읽을 수 있으면 클론 완료
            proxmox.nodes(node_name).qemu(vmid).config.get()
            return
        except Exception:
            time.sleep(2)
    raise HTTPException(status_code=500, detail=f"VM {vmid} 클론 타임아웃 ({timeout}초)")


# ── VM 생성 ─────────────────────────────────────────────────

def create_vm(
    db: Session,
    current_user: User,
    tier,
    os=None,
    node_name: str = None,
    name: str = None,
    custom_cores: int = None,
    custom_memory: int = None,
    custom_disk: int = None,
):
    """
    VM 생성 (Full Clone + Cloud-Init + 포트포워딩)

    1. 사용자 VM 개수 제한 확인
    2. 최적 서버 탐색 (또는 지정 서버 사용)
    3. 내부 IP 자동 할당
    4. 템플릿 Full Clone
    5. Cloud-Init 설정 주입 (유저, 비밀번호, 고정 IP)
    6. 리소스 스펙 적용 (CPU, RAM)
    7. iptables 포트포워딩 등록
    8. VM 부팅 + DB 저장
    """
    from services.mon_service import get_best_server

    # 0. VM 개수 제한 (ADMIN, PROJECT_OWNER는 제한 없음)
    if current_user.role == UserRole.USER:
        user_vm_count = db.query(Vm).filter(Vm.owner_id == current_user.id).count()
        if user_vm_count >= settings.MAX_VMS_PER_USER:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"생성 가능한 최대 VM 개수({settings.MAX_VMS_PER_USER}개)를 초과했습니다.",
            )

    # 프로젝트 커스텀 티어는 PROJECT_OWNER 또는 ADMIN만 사용 가능
    from schemas.vm_schema import VMTier as VMTierEnum
    if tier == VMTierEnum.PROJECT_CUSTOM and current_user.role not in (UserRole.ADMIN, UserRole.PROJECT_OWNER):
        raise HTTPException(status_code=403, detail="프로젝트 커스텀 티어는 프로젝트 오너만 사용할 수 있습니다.")

    # 프로젝트 커스텀 티어는 전용 노드 강제
    if tier == VMTierEnum.PROJECT_CUSTOM:
        node_name = settings.PROJECT_NODE_NAME

    # 역할 기반 노드 접근 제어 (ADMIN은 모든 노드 허용)
    if node_name and current_user.role != UserRole.ADMIN:
        project_node = settings.PROJECT_NODE_NAME
        if current_user.role == UserRole.USER and node_name == project_node:
            raise HTTPException(
                status_code=403,
                detail="일반 사용자는 프로젝트 전용 노드에 VM을 생성할 수 없습니다.",
            )
        if current_user.role == UserRole.PROJECT_OWNER and node_name != project_node:
            raise HTTPException(
                status_code=403,
                detail=f"프로젝트 오너는 프로젝트 전용 노드({project_node})에서만 VM을 생성할 수 있습니다.",
            )

    specs = TIER_SPECS.get(tier)
    if not specs:
        raise HTTPException(status_code=400, detail="유효하지 않은 티어입니다.")

    # project_custom 티어: 사용자 지정 스펙 적용 (상한 검증)
    if tier == VMTierEnum.PROJECT_CUSTOM:
        max_specs = TIER_SPECS[VMTierEnum.PROJECT_CUSTOM]
        specs = dict(specs)  # 복사 후 덮어쓰기
        if custom_cores is not None:
            if not (2 <= custom_cores <= max_specs["cores"]):
                raise HTTPException(status_code=400, detail=f"vCPU는 2~{max_specs['cores']}개 범위입니다.")
            specs["cores"] = custom_cores
        if custom_memory is not None:
            if not (2048 <= custom_memory <= max_specs["memory"]):
                raise HTTPException(status_code=400, detail=f"RAM은 2048~{max_specs['memory']}MB (2~32GB) 범위입니다.")
            specs["memory"] = custom_memory
        if custom_disk is not None:
            if not (30 <= custom_disk <= max_specs["disk"]):
                raise HTTPException(status_code=400, detail=f"디스크는 30~{max_specs['disk']}GB 범위입니다.")
            specs["disk"] = custom_disk

    # 1. 서버 선택
    if node_name:
        server = db.query(Server).filter(
            Server.name == node_name, Server.is_active == True
        ).first()
        if not server:
            raise HTTPException(
                status_code=404,
                detail=f"노드 '{node_name}'을(를) 찾을 수 없거나 비활성 상태입니다.",
            )
    else:
        server = get_best_server(db, required_ram_mb=specs["memory"])

    # 2. OS별 템플릿 및 유저명 결정
    from schemas.vm_schema import VMOs
    os = os or VMOs.UBUNTU2204

    if os == VMOs.WINDOWS_SERVER:
        template_vmid = settings.TEMPLATE_VMID_WINDOWS
        default_user = settings.VM_DEFAULT_USER_WINDOWS
    else:
        template_vmid = settings.TEMPLATE_VMID
        default_user = settings.VM_DEFAULT_USER

    # 3. 내부 IP 할당
    internal_ip = _allocate_internal_ip(db)

    # 4. Proxmox 연결 & VMID 할당
    proxmox = get_proxmox_for_server(server)
    vmid = _get_next_vmid(proxmox, server.name)
    vm_name, vm_display_name = _generate_vm_name(current_user, tier.value, custom_name=name)
    vm_password = _generate_password()

    try:
        # 5. 템플릿 Full Clone
        proxmox.nodes(server.name).qemu(template_vmid).clone.post(
            newid=vmid,
            name=vm_name,
            full=1,                     # full clone (linked clone이 아닌 독립 디스크)
            target=server.name,
        )

        # 클론 완료 대기
        _wait_for_clone(proxmox, server.name, vmid)

        # 6. Cloud-Init 설정 주입 (VM별 동적 스니펫)
        #    템플릿에는 cicustom 없음 → 클론 후 동적 스니펫 생성 → cicustom user= 적용
        ip_config = f"ip={internal_ip}/{settings.INTERNAL_NETMASK},gw={settings.INTERNAL_GATEWAY}"

        snippet_filename = f"user-data-{vmid}.yaml"
        userdata_yaml = _generate_userdata_yaml(
            password=vm_password,
            root_password=settings.VM_ROOT_PASSWORD or _generate_password(),
        )
        _upload_snippet(server, snippet_filename, userdata_yaml)

        proxmox.nodes(server.name).qemu(vmid).config.put(
            cicustom=f"user=local:snippets/{snippet_filename}",
            ipconfig0=ip_config,
            nameserver=settings.INTERNAL_DNS,
        )

        # 7. 리소스 스펙 적용 (템플릿 기본값 덮어쓰기)
        config_params = {
            "memory": specs["memory"],
            "cores": specs["cores"],
            "sockets": 1,
        }

        # 프로젝트 커스텀 티어: 핫플러그 활성화 (소켓 기반 CPU 변경, NUMA 필수)
        if tier == VMTierEnum.PROJECT_CUSTOM:
            config_params["hotplug"] = "cpu,memory"
            config_params["balloon"] = specs["memory"] // 2
            config_params["numa"] = 1
            # 소켓 기반: cores=2 고정, sockets로 총 vCPU 조절 (2,4,6,8)
            sockets = max(1, specs["cores"] // 2)
            config_params["cores"] = 2
            config_params["sockets"] = sockets

        proxmox.nodes(server.name).qemu(vmid).config.put(**config_params)

        # 디스크 리사이즈 (템플릿 디스크 → 티어 디스크 크기)
        proxmox.nodes(server.name).qemu(vmid).resize.put(
            disk="scsi0",
            size=f"{specs['disk']}G",
        )

        # 8. iptables 포트포워딩 등록
        manage_iptables(server, vmid, internal_ip, action="ADD")

        # 9. VM 부팅
        proxmox.nodes(server.name).qemu(vmid).status.start.post()

        # 10. cicustom 해제 + 스니펫 정리 (cloud-init은 첫 부팅에만 적용)
        try:
            proxmox.nodes(server.name).qemu(vmid).config.put(delete="cicustom")
            logger.info(f"VM {vmid} cicustom 해제 완료")
        except Exception as e:
            logger.warning(f"VM {vmid} cicustom 해제 실패 (무시): {e}")

        try:
            _delete_snippet(server, snippet_filename)
        except Exception:
            logger.warning(f"스니펫 삭제 실패 (무시): {snippet_filename}")

        # 11. DB 저장
        # 일반 유저 VM은 30일 후 만료
        expires_at = None
        if current_user.role == UserRole.USER:
            expires_at = now_kst() + timedelta(days=30)

        new_vm = Vm(
            hypervisor_vmid=vmid,
            name=vm_name,
            display_name=vm_display_name,
            server_id=server.id,
            owner_id=current_user.id,
            allocated_ram_mb=specs["memory"],
            allocated_cores=specs["cores"],
            internal_ip=internal_ip,
            vm_password=vm_password,
            expires_at=expires_at,
        )
        db.add(new_vm)
        db.add(Notification(
            user_id=current_user.id,
            type="success",
            message=f"VM '{vm_name}'이(가) 노드 '{server.name}'에 생성되었습니다.",
        ))
        db.commit()

        return {
            "success": True,
            "message": f"VM {vm_name}({vmid})이(가) 노드 '{server.name}'에 생성되었습니다.",
            "assigned_node": server.name,
            "vmid": vmid,
            "name": vm_name,
            "tier": tier.value,
            "internal_ip": internal_ip,
            "ssh_user": default_user,
            "ssh_password": vm_password,
        }

    except HTTPException:
        raise
    except Exception as e:
        # 실패 시 생성된 VM + 스니펫 정리 시도
        try:
            proxmox.nodes(server.name).qemu(vmid).delete()
        except Exception:
            logger.warning(f"VM {vmid} 생성 실패 후 정리 중 오류 (수동 확인 필요)")
        try:
            _delete_snippet(server, f"user-data-{vmid}.yaml")
        except Exception:
            pass
        db.rollback()
        logger.error(f"VM 생성 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail="VM 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
        )


# ── VM 삭제 ─────────────────────────────────────────────────

def delete_vm(
    db: Session,
    vm_record: Vm,
    purge: bool = False,
):
    """
    VM 삭제.
    1. VM 강제 정지 (실행 중일 경우)
    2. Proxmox에서 VM 삭제
    3. iptables 포트포워딩 규칙 제거
    4. DB 레코드 삭제
    """
    server = vm_record.server
    proxmox = get_proxmox_for_server(server)
    vmid = vm_record.hypervisor_vmid

    try:
        # 실행 중인 VM은 먼저 정지
        try:
            vm_status = proxmox.nodes(server.name).qemu(vmid).status.current.get()
            if vm_status.get("status") == "running":
                proxmox.nodes(server.name).qemu(vmid).status.stop.post()
                time.sleep(3)
        except Exception:
            pass  # 이미 정지 상태이거나 조회 실패 — 삭제 진행

        delete_params = {"purge": 1} if purge else {}
        proxmox.nodes(server.name).qemu(vmid).delete(**delete_params)

        # iptables 규칙 제거
        if vm_record.internal_ip:
            manage_iptables(server, vmid, vm_record.internal_ip, action="DELETE")

        owner_id = vm_record.owner_id
        vm_name = vm_record.name
        db.delete(vm_record)
        if owner_id:
            db.add(Notification(
                user_id=owner_id,
                type="success",
                message=f"VM '{vm_name}'이(가) 삭제되었습니다.",
            ))
        db.commit()

        return {"success": True, "message": f"VM {vmid} 삭제 완료"}
    except Exception as e:
        db.rollback()
        logger.error(f"VM 삭제 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail="VM 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
        )
