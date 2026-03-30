import logging
from proxmoxer import ProxmoxAPI
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def get_proxmox_for_server(server):
    """
    서버(Server) 모델 기반으로 Proxmox에 연결합니다.
    각 노드의 ip_address, port, api_user, api_password를 사용합니다.
    """
    try:
        proxmox = ProxmoxAPI(
            server.ip_address,
            user=server.api_user,
            password=server.api_password,
            port=str(server.port),
            verify_ssl=False,
            timeout=180,
        )
        return proxmox
    except Exception as e:
        logger.error(f"Proxmox 연결 실패 ({server.name}): {e}")
        raise HTTPException(
            status_code=500,
            detail="서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요."
        )
