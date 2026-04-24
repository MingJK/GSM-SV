import logging
import threading
import time
from proxmoxer import ProxmoxAPI
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# 서버별 Proxmox 연결 캐시 (TTL 5분)
_proxmox_cache: dict[int, tuple[object, float]] = {}  # server_id → (proxmox, expires_at)
_cache_lock = threading.Lock()
_CACHE_TTL = 300  # 5분


def raise_proxmox_http_exception(e: Exception, context: str = "") -> None:
    """
    Proxmox API 호출 중 발생한 예외를 메시지 기반으로 분류하여 적절한 HTTPException을 발생시킵니다.
    - "Permission denied" → 403
    - "does not exist" / "not found" → 404
    - 타임아웃 관련 → 503
    - 그 외 → 500
    """
    msg = str(e).lower()
    if context:
        logger.error(f"[proxmox] {context}: {e}")
    if "permission denied" in msg:
        raise HTTPException(status_code=403, detail="Proxmox 권한이 없습니다.")
    if "does not exist" in msg or "not found" in msg:
        raise HTTPException(status_code=404, detail="요청한 리소스를 찾을 수 없습니다.")
    if "timeout" in msg or "timed out" in msg or "connection timed out" in msg:
        raise HTTPException(status_code=503, detail="Proxmox 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.")
    raise HTTPException(status_code=500, detail="서버 오류가 발생했습니다.")


def get_proxmox_for_server(server):
    """
    서버(Server) 모델 기반으로 Proxmox에 연결합니다.
    서버별 연결을 캐싱하여 불필요한 재연결을 방지합니다 (TTL 5분).
    """
    now = time.time()

    with _cache_lock:
        cached = _proxmox_cache.get(server.id)
        if cached and cached[1] > now:
            return cached[0]

    try:
        proxmox = ProxmoxAPI(
            server.ip_address,
            user=server.api_user,
            password=server.api_password,
            port=str(server.port),
            verify_ssl=False,
            timeout=180,
        )
        with _cache_lock:
            _proxmox_cache[server.id] = (proxmox, now + _CACHE_TTL)
        return proxmox
    except Exception as e:
        logger.error(f"Proxmox 연결 실패 ({server.name}): {e}")
        raise HTTPException(
            status_code=503,
            detail="서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요."
        )
