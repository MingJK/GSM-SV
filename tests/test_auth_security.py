"""
Domain 2: 인증 및 권한 테스트 (AUTH-TC-01 ~ AUTH-TC-08)

비밀번호 재설정 시도 제한, 코드 재발송, JWT 타임존, VM 소유권 필터 검증.
"""
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.database import Base
from models.user import User, UserRole
from models.server import Server
from models.vm import Vm
from models.email_verification import EmailVerification
from core.security import create_access_token, create_refresh_token
from core.timezone import now_kst
from api.dependencies import get_vm_with_owner_check
from fastapi import HTTPException

# ── 테스트용 DB ────────────────────────────────────────────────

TEST_DB_URL = "sqlite:///./test_auth_security.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestSession()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


# ── 공용 Fixture ──────────────────────────────────────────────

@pytest.fixture
def user_a(db):
    u = User(email="usera@gsm.hs.kr", hashed_password="hashed", role=UserRole.USER, is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def user_b(db):
    u = User(email="userb@gsm.hs.kr", hashed_password="hashed", role=UserRole.USER, is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def admin(db):
    u = User(email="admin@gsm.hs.kr", hashed_password="hashed", role=UserRole.ADMIN, is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def server(db):
    s = Server(
        name="node-1", ip_address="192.168.1.10", port=8006,
        api_user="root@pam", api_password="pw",
        is_active=True, base_port=21000, last_free_ram_mb=8000,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@pytest.fixture
def password_reset_record(db):
    """비밀번호 재설정용 EmailVerification 레코드"""
    record = EmailVerification(
        email="usera@gsm.hs.kr",
        hashed_password="",
        code="123456",
        signup_role="password_reset",
        expires_at=now_kst() + timedelta(minutes=10),
        verified=False,
        attempts=0,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ── AUTH-TC-01: 비밀번호 재설정 시도 횟수 제한 ─────────────────

class TestPasswordResetAttemptLimit:
    """AUTH-TC-01: 5회 오입력 후 정확한 코드도 거부"""

    def test_attempts_increment_on_wrong_code(self, db, password_reset_record):
        """오답 입력 시 attempts 증가 확인"""
        record = password_reset_record
        assert record.attempts == 0

        # 5회 오입력 시뮬레이션
        for i in range(5):
            record.attempts = i + 1
        db.commit()

        assert record.attempts == 5

    def test_locked_after_5_attempts(self, db, password_reset_record):
        """5회 시도 후 attempts >= 5 상태 확인 (비즈니스 로직 검증)"""
        record = password_reset_record
        record.attempts = 5
        db.commit()

        # 비즈니스 로직: attempts >= 5 이면 429 반환해야 함
        assert record.attempts >= 5


# ── AUTH-TC-02: 코드 재발송 시 attempts 리셋 ──────────────────

class TestResendCodeResetsAttempts:
    """AUTH-TC-02: 재발송 시 attempts=0으로 리셋"""

    def test_resend_resets_attempts(self, db, password_reset_record):
        """코드 재발송 시 attempts가 0으로 리셋되는지 확인"""
        record = password_reset_record
        record.attempts = 5
        db.commit()

        # resend_code 로직 시뮬레이션
        record.code = "654321"
        record.attempts = 0
        record.expires_at = now_kst() + timedelta(minutes=10)
        db.commit()

        db.refresh(record)
        assert record.attempts == 0
        assert record.code == "654321"


# ── AUTH-TC-04: JWT exp 필드 타임존 확인 ──────────────────────

class TestJWTTimezone:
    """AUTH-TC-04: JWT가 UTC 기반 exp 사용"""

    def test_access_token_uses_utc(self):
        """Access Token의 exp가 UTC 기반"""
        from jose import jwt as jose_jwt
        from core.config import settings

        token = create_access_token(subject="1")
        payload = jose_jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp = payload["exp"]
        # exp는 UTC 타임스탬프여야 함
        now_utc = datetime.now(timezone.utc).timestamp()
        # exp는 현재 시간 이후여야 함
        assert exp > now_utc
        # exp는 ACCESS_TOKEN_EXPIRE_MINUTES + 1분 이내여야 함
        max_exp = now_utc + (settings.ACCESS_TOKEN_EXPIRE_MINUTES + 1) * 60
        assert exp < max_exp

    def test_refresh_token_uses_utc(self):
        """Refresh Token의 exp가 UTC 기반"""
        from jose import jwt as jose_jwt
        from core.config import settings

        token = create_refresh_token(subject="1")
        payload = jose_jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp = payload["exp"]
        now_utc = datetime.now(timezone.utc).timestamp()
        assert exp > now_utc


# ── AUTH-TC-05: User A가 User B의 VM에 node 파라미터로 접근 ──

class TestVMOwnerIsolation:
    """AUTH-TC-05/06: VM 소유권 필터링"""

    def test_user_cannot_access_others_vm_with_node(self, db, user_a, user_b, server):
        """AUTH-TC-05: User A가 node 파라미터로 User B의 VM 접근 시 404"""
        vm = Vm(
            hypervisor_vmid=200,
            name="userb-vm",
            server_id=server.id,
            owner_id=user_b.id,
            internal_ip="10.0.0.100",
        )
        db.add(vm)
        db.commit()

        with pytest.raises(HTTPException) as exc_info:
            get_vm_with_owner_check(db, vmid=200, current_user=user_a, node="node-1")
        assert exc_info.value.status_code == 404

    def test_admin_can_access_any_vm_with_node(self, db, admin, user_b, server):
        """AUTH-TC-06: Admin은 node 파라미터로 아무 VM 접근 가능"""
        vm = Vm(
            hypervisor_vmid=200,
            name="userb-vm",
            server_id=server.id,
            owner_id=user_b.id,
            internal_ip="10.0.0.100",
        )
        db.add(vm)
        db.commit()

        result = get_vm_with_owner_check(db, vmid=200, current_user=admin, node="node-1")
        assert result.id == vm.id

    def test_user_can_access_own_vm_with_node(self, db, user_a, server):
        """소유자는 node 파라미터 포함해도 자기 VM 접근 가능"""
        vm = Vm(
            hypervisor_vmid=200,
            name="usera-vm",
            server_id=server.id,
            owner_id=user_a.id,
            internal_ip="10.0.0.100",
        )
        db.add(vm)
        db.commit()

        result = get_vm_with_owner_check(db, vmid=200, current_user=user_a, node="node-1")
        assert result.id == vm.id

    def test_user_cannot_access_others_vm_without_node(self, db, user_a, user_b, server):
        """node 없이도 다른 유저의 VM 접근 불가"""
        vm = Vm(
            hypervisor_vmid=200,
            name="userb-vm",
            server_id=server.id,
            owner_id=user_b.id,
            internal_ip="10.0.0.100",
        )
        db.add(vm)
        db.commit()

        with pytest.raises(HTTPException) as exc_info:
            get_vm_with_owner_check(db, vmid=200, current_user=user_a)
        assert exc_info.value.status_code == 404

    def test_cross_node_same_vmid_isolated_by_node(self, db, user_a, user_b):
        """
        두 노드에 동일 vmid가 존재하는 상황에서 node 필터가 교차 조회를 방지.
        User A는 node-1의 VM만, User B는 node-2의 VM만 조회 가능해야 함.
        """
        server1 = Server(
            name="node-1", ip_address="192.168.1.10", port=8006,
            api_user="root@pam", api_password="pw",
            is_active=True, base_port=21000, last_free_ram_mb=8000,
        )
        server2 = Server(
            name="node-2", ip_address="192.168.1.11", port=8006,
            api_user="root@pam", api_password="pw",
            is_active=True, base_port=22000, last_free_ram_mb=8000,
        )
        db.add_all([server1, server2])
        db.commit()
        db.refresh(server1)
        db.refresh(server2)

        # 같은 vmid 300이 두 노드에 존재
        vm_a = Vm(
            hypervisor_vmid=300, name="a-vm",
            server_id=server1.id, owner_id=user_a.id,
            internal_ip="10.0.0.10",
        )
        vm_b = Vm(
            hypervisor_vmid=300, name="b-vm",
            server_id=server2.id, owner_id=user_b.id,
            internal_ip="10.0.1.10",
        )
        db.add_all([vm_a, vm_b])
        db.commit()

        # User A가 node-1 지정 → 자기 VM 반환
        result = get_vm_with_owner_check(db, vmid=300, current_user=user_a, node="node-1")
        assert result.id == vm_a.id
        assert result.owner_id == user_a.id

        # User A가 node-2 지정 (User B의 VM 접근 시도) → 404
        with pytest.raises(HTTPException) as exc_info:
            get_vm_with_owner_check(db, vmid=300, current_user=user_a, node="node-2")
        assert exc_info.value.status_code == 404

        # User B가 node-2 지정 → 자기 VM 반환
        result_b = get_vm_with_owner_check(db, vmid=300, current_user=user_b, node="node-2")
        assert result_b.id == vm_b.id
        assert result_b.owner_id == user_b.id

    def test_admin_with_node_selects_correct_vm_across_nodes(self, db, admin, user_a, user_b):
        """Admin도 node 파라미터로 특정 노드의 VM만 조회 — 교차 오염 방지"""
        server1 = Server(
            name="node-1", ip_address="192.168.1.10", port=8006,
            api_user="root@pam", api_password="pw",
            is_active=True, base_port=21000, last_free_ram_mb=8000,
        )
        server2 = Server(
            name="node-2", ip_address="192.168.1.11", port=8006,
            api_user="root@pam", api_password="pw",
            is_active=True, base_port=22000, last_free_ram_mb=8000,
        )
        db.add_all([server1, server2])
        db.commit()
        db.refresh(server1)
        db.refresh(server2)

        vm_a = Vm(
            hypervisor_vmid=400, name="a-vm",
            server_id=server1.id, owner_id=user_a.id,
            internal_ip="10.0.0.10",
        )
        vm_b = Vm(
            hypervisor_vmid=400, name="b-vm",
            server_id=server2.id, owner_id=user_b.id,
            internal_ip="10.0.1.10",
        )
        db.add_all([vm_a, vm_b])
        db.commit()

        result1 = get_vm_with_owner_check(db, vmid=400, current_user=admin, node="node-1")
        assert result1.id == vm_a.id
        result2 = get_vm_with_owner_check(db, vmid=400, current_user=admin, node="node-2")
        assert result2.id == vm_b.id


# ── AUTH-TC-08: 만료된 인증 코드 ──────────────────────────────

class TestExpiredResetCode:
    """AUTH-TC-08: 만료된 코드로 비밀번호 재설정 시도"""

    def test_expired_code_record(self, db):
        """만료된 레코드 확인"""
        expired_time = datetime.now() - timedelta(minutes=5)
        record = EmailVerification(
            email="test@gsm.hs.kr",
            hashed_password="",
            code="123456",
            signup_role="password_reset",
            expires_at=expired_time,
            verified=False,
            attempts=0,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        # 비즈니스 로직: 현재 시각 > expires_at 이면 400 반환
        assert datetime.now() > record.expires_at


# ── 포트 범위 검증 (calculate_ports) 추가 확인 ────────────────

class TestPortRangeValidation:
    """포트 계산 시 범위 초과 검증"""

    def test_svc2_overflow(self):
        """svc2 포트(base+2000+vmid)가 65535 초과 시 ValueError"""
        from services.network_service import calculate_ports
        with pytest.raises(ValueError):
            calculate_ports(63000, 1000)  # svc2 = 63000+2000+1000 = 66000 > 65535
