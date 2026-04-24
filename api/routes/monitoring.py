import logging
import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from services.proxmox_client import get_proxmox_for_server
from core.database import get_db
from models.server import Server
from models.user import User
from api.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

_stats_cache: dict[str, dict] = {}
_STATS_CACHE_TTL = 30

@router.get("/nodes")
async def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    플랫폼에 등록된 모든 활성 서버(Node)의 리소스 취합 조회 (USER/ADMIN 모두 가능)
    VM 생성 전 사용자가 직접 노드별 사용률을 확인하기 위해 사용됩니다.
    """
    servers = db.query(Server).filter(Server.is_active == True).all()
    if not servers:
        return {"message": "등록된 활성 서버가 없습니다.", "stats": {}}

    all_stats = {}

    for server in servers:
        cached = _stats_cache.get(server.name)
        if cached and (time.time() - cached["ts"]) < _STATS_CACHE_TTL:
            all_stats[server.name] = cached["data"]
            continue

        try:
            proxmox = get_proxmox_for_server(server)

            node_status = proxmox.nodes(server.name).status.get()

            cpu_usage = node_status.get('cpu', 0) * 100

            memory = node_status.get('memory', {})
            total_ram_gb = memory.get('total', 0) / (1024**3)
            used_ram_gb = memory.get('used', 0) / (1024**3)
            free_ram_gb = total_ram_gb - used_ram_gb

            result = {
                "status": "online",
                "cpu_usage_percent": round(cpu_usage, 1),
                "ram_total_gb": round(total_ram_gb, 1),
                "ram_used_gb": round(used_ram_gb, 1),
                "ram_free_gb": round(free_ram_gb, 1),
                "uptime_seconds": node_status.get('uptime', 0)
            }
            _stats_cache[server.name] = {"data": result, "ts": time.time()}
            all_stats[server.name] = result
        except Exception as e:
            logger.error(f"[monitoring] 노드 {server.name} 조회 실패: {e}")
            all_stats[server.name] = {
                "status": "offline",
                "error": "노드에 연결할 수 없습니다."
            }

    return {"stats": all_stats}
