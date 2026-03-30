# GSM SV — 기능 명세서 v1.0

> Proxmox 기반 IaaS VM 관리 플랫폼. 실제 구현 코드와 동기화된 명세서입니다.

---

## 1. 프로젝트 개요

Proxmox 기반의 물리 GPU 서버 클러스터(3노드)를 클라우드 서비스처럼 사용할 수 있도록 제공하는 **VM 프로비저닝 및 제어 플랫폼**입니다.
사용자는 웹 콘솔을 통해 VM 생성, 전원 제어, 방화벽, 리소스 모니터링, 핫플러그 리사이징 등을 수행할 수 있습니다.

### 네트워크 구조

```text
인터넷
  └─ Vultr (공인 IP: 172.10.104.3, GRE 터널 엔드포인트)
        └─ GRE 터널
              └─ Router (iptables 포트포워딩, -d 172.10.104.3)
                    ├─ GSM GPU 1 (Proxmox, SSH: 10011) → VM들
                    ├─ GSM GPU 2 (Proxmox, SSH: 10012) → VM들
                    └─ GSM GPU 3 (Proxmox, SSH: 10013) → VM들
```

외부에서 VM 접근은 **Router의 iptables DNAT 포트포워딩**을 통해 이루어집니다.

---

## 2. 기술 스택

| 분류 | 기술 |
|------|------|
| Backend | FastAPI (Python 3.14) |
| Frontend | Next.js 15 (App Router, TypeScript) |
| ORM | SQLAlchemy |
| DB | SQLite |
| 인증 | JWT (Access + Refresh Token), DataGSM OAuth 2.0 + PKCE |
| Proxmox 연동 | Proxmoxer |
| SSH/SFTP | Paramiko (포트포워딩, 스니펫 업로드) |
| Cloud-Init | 동적 user-data 스니펫 (SSH 업로드 → cicustom) |
| OS 템플릿 | Ubuntu 22.04 LTS (Cloud Image) |
| 시간대 | KST (Asia/Seoul) — DB 직접 저장 |
| UI 라이브러리 | shadcn/ui, Tailwind CSS, Recharts, Lucide Icons |

---

## 3. 프로젝트 디렉토리 구조

```text
newconsole-beta/
├── main.py                 # FastAPI 앱 진입점, 라우터 등록, CORS
├── .env                    # 환경변수 (git 제외)
├── core/
│   ├── config.py           # 환경변수 로딩 (Settings)
│   ├── constants.py        # VM 티어 스펙 상수
│   ├── database.py         # SQLAlchemy 엔진, 세션, Base
│   ├── security.py         # JWT 생성/검증, bcrypt 해싱
│   └── timezone.py         # KST 시간대 유틸리티
├── models/
│   ├── user.py             # 회원 모델 (ADMIN/PROJECT_OWNER/USER)
│   ├── server.py           # Proxmox 서버 정보 + SSH 자격증명
│   ├── vm.py               # VM 정보 + 만료일
│   └── notification.py     # 알림 모델 (DB 영속)
├── schemas/
│   ├── user_schema.py      # 회원가입, 로그인 검증
│   ├── vm_schema.py        # VM 생성/제어 검증 (Tier, OS, Node)
│   └── fw_schema.py        # 방화벽 규칙 검증
├── api/
│   ├── dependencies.py     # JWT 인증, 관리자 확인, VM 소유권 검증
│   └── routes/
│       ├── auth.py         # 인증 (가입, 로그인, 비밀번호 변경)
│       ├── oauth.py        # DataGSM OAuth 2.0 + PKCE
│       ├── vmcontrol.py    # VM CRUD, 전원제어, 리사이징, 만료연장
│       ├── firewall.py     # 방화벽 규칙 CRUD
│       ├── network.py      # 포트포워딩 정보 조회
│       ├── monitoring.py   # 노드 상태 조회
│       └── notifications.py # 알림 CRUD
├── services/
│   ├── vm_service.py       # VM 생성/삭제 (클론, Cloud-Init, iptables)
│   ├── mon_service.py      # 자원 스케줄링 (Auto Provisioning)
│   ├── network_service.py  # 포트 계산 및 iptables 관리
│   └── proxmox_client.py   # Proxmox API 클라이언트
└── frontend/
    └── app/
        ├── login/              # 로그인 페이지
        ├── signup/             # 일반 회원가입
        ├── signup/project/     # 프로젝트 오너 가입
        ├── verify/             # 이메일 인증
        ├── reset-password/     # 비밀번호 초기화
        ├── auth/callback/      # OAuth 콜백
        └── (dashboard)/
            ├── instances/      # VM 목록 + 상세 (탭: 개요, 모니터링, 방화벽, 설정)
            ├── deploy/         # VM 생성 위자드 (OS → 노드 → 사양 → 확인)
            ├── settings/       # 사용자 설정 (비밀번호 변경, 테마)
            └── docs/           # 문서 페이지
```

---

## 4. API 엔드포인트

### 4.1 인증 (Authentication) — `/api/v1/auth`

| 기능 | Method | Endpoint | 권한 | 설명 |
|------|--------|----------|------|------|
| 일반 회원가입 | `POST` | `/signup` | 누구나 | 학생 인증 + 이메일 인증코드 발송 |
| 프로젝트 오너 확인 | `POST` | `/signup/project/check` | 누구나 | 학생 + 프로젝트 참여 여부 확인 |
| 프로젝트 오너 가입 | `POST` | `/signup/project` | 누구나 | 프로젝트 선택 + 비밀번호 + 사유 → 인증코드 발송 |
| 이메일 인증 | `POST` | `/verify` | 누구나 | 인증코드 확인 후 계정 생성 |
| 인증코드 재발송 | `POST` | `/resend-code` | 누구나 | 이메일 인증코드 재발송 |
| 로그인 | `POST` | `/login` | 누구나 | JWT Access + Refresh Token 발급 |
| 토큰 갱신 | `POST` | `/refresh` | 누구나 | Refresh Token으로 새 토큰 쌍 발급 |
| 내 정보 | `GET` | `/me` | 로그인 | 현재 사용자 프로필 반환 |
| 비밀번호 변경 | `PUT` | `/change-password` | 로그인 | 기존 비밀번호 확인 후 변경 |
| 비밀번호 초기화 요청 | `POST` | `/password-reset/request` | 누구나 | 이메일로 초기화 인증코드 발송 |
| 비밀번호 초기화 확인 | `POST` | `/password-reset/confirm` | 누구나 | 인증코드 확인 후 새 비밀번호 설정 |
| 로그아웃 | `POST` | `/logout` | 로그인 | Stateless (클라이언트 토큰 파기) |
| 승인 대기 목록 | `GET` | `/pending-approvals` | ADMIN | 프로젝트 오너 승인 대기 목록 |
| 가입 승인 | `POST` | `/approve/{user_id}` | ADMIN | 프로젝트 오너 가입 승인 |
| 가입 거절 | `POST` | `/reject/{user_id}` | ADMIN | 프로젝트 오너 가입 거절 (계정 삭제) |

### 4.2 OAuth — `/api/v1/oauth`

| 기능 | Method | Endpoint | 권한 | 설명 |
|------|--------|----------|------|------|
| OAuth 인증 시작 | `GET` | `/authorize` | 누구나 | PKCE 생성 → DataGSM 로그인 페이지 리다이렉트 |
| OAuth 콜백 | `GET` | `/callback` | 누구나 | 코드 교환 → userinfo → 계정 연동/생성 → JWT 발급 |

- **계정 연동**: 같은 이메일의 기존 계정이 있으면 OAuth 정보를 연결, 없으면 새 계정 생성
- **PKCE**: Authorization Code + code_verifier/code_challenge (S256)

### 4.3 VM 관리 — `/api/v1/vm`

| 기능 | Method | Endpoint | 권한 | 설명 |
|------|--------|----------|------|------|
| VM 생성 | `POST` | `/create` | 로그인 | 티어 + OS + 노드 선택 → Full Clone + Cloud-Init + 포트포워딩 |
| 내 VM 목록 | `GET` | `/my-vms` | 로그인 | 전체 노드 본인 소유 VM 리스트 |
| 전체 VM 목록 | `GET` | `/admin/all-vms` | ADMIN | 노드별 그룹핑된 전체 VM (소유자 이메일 포함) |
| 노드 VM 목록 | `GET` | `/{node}/vms` | 로그인 | 특정 노드 VM 리스트 |
| VM 상태 조회 | `GET` | `/{node}/vms/{vmid}/status` | Owner/ADMIN | CPU, RAM, 디스크 상세 |
| VM 메트릭스 | `GET` | `/{node}/vms/{vmid}/metrics` | Owner/ADMIN | 실시간 모니터링 (1h/6h/24h) |
| VM 전원 제어 | `POST` | `/{node}/vms/{vmid}/action` | Owner/ADMIN | start, stop, shutdown, reboot |
| VM 리사이징 | `PUT` | `/{node}/vms/{vmid}/resize` | PO/ADMIN | CPU(소켓)/메모리 핫플러그 변경 |
| VM 만료 연장 | `POST` | `/{node}/vms/{vmid}/extend` | Owner | 만료 15일 전부터 30일 연장 가능 |
| VM 삭제 | `DELETE` | `/{node}/vms/{vmid}` | Owner/ADMIN | VM 삭제 + iptables 정리 + DB 삭제 |
| 노드 목록 | `GET` | `/nodes` | ADMIN | 활성 Proxmox 노드 목록 |
| 노드 리소스 | `GET` | `/nodes/resources` | 로그인 | 노드별 CPU/RAM/SSD 사용량 (배포 페이지용) |

**VM 생성 플로우:**

```text
1. 요청 검증 (USER 최대 3개, 역할별 노드 접근 제어)
2. 노드 선택 (지정 또는 Auto Provisioning)
3. 내부 IP 자동 할당 (10.0.0.x, DB 기반 충돌 방지)
4. 템플릿 Full Clone + VMID 자동 할당
5. Cloud-Init 스니펫 생성 → SSH/SFTP 업로드
6. cicustom user= 설정 → 리소스 스펙 적용 → 디스크 리사이즈
7. iptables 포트포워딩 등록 (SSH/HTTP/SVC)
8. VM 부팅
9. cicustom 해제 + 스니펫 삭제
10. DB 저장 (만료일: USER는 30일)
```

### 4.4 네트워크 — `/api/v1/network`

| 기능 | Method | Endpoint | 권한 | 설명 |
|------|--------|----------|------|------|
| 포트 목록 | `GET` | `/{vmid}/ports` | Owner/ADMIN | SSH, HTTP, SVC 포트 정보 |

### 4.5 방화벽 — `/api/v1/firewall`

| 기능 | Method | Endpoint | 권한 | 설명 |
|------|--------|----------|------|------|
| 룰 목록 | `GET` | `/{vmid}/rules` | Owner/ADMIN | Proxmox 방화벽 규칙 조회 |
| 룰 추가 | `POST` | `/{vmid}/rules` | Owner/ADMIN | TCP/UDP, 소스IP, 포트 설정 |
| 룰 삭제 | `DELETE` | `/{vmid}/rules/{pos}` | Owner/ADMIN | 우선순위(pos) 기준 삭제 |

### 4.6 모니터링 — `/api/v1/monitoring`

| 기능 | Method | Endpoint | 권한 | 설명 |
|------|--------|----------|------|------|
| 노드 상태 | `GET` | `/nodes` | 로그인 | 전체 노드 CPU/RAM/업타임 |

### 4.7 알림 — `/api/v1/notifications`

| 기능 | Method | Endpoint | 권한 | 설명 |
|------|--------|----------|------|------|
| 알림 목록 | `GET` | `/` | 로그인 | 최근 50개 알림 (15일 보관) |
| 읽음 처리 | `PATCH` | `/{id}/read` | 로그인 | 단일 알림 읽음 표시 |
| 전체 읽음 | `POST` | `/read-all` | 로그인 | 모든 알림 읽음 처리 |
| 알림 삭제 | `DELETE` | `/{id}` | 로그인 | 단일 알림 삭제 |

---

## 5. 권한 체계 (RBAC)

| 역할 | VM 생성 | 노드 접근 | VM 만료 | 핫플러그 | 특수 기능 |
|------|---------|-----------|---------|----------|-----------|
| `ADMIN` | 무제한 | 전체 노드 | 없음 | O | 가입 승인/거절, 전체 VM 조회 |
| `PROJECT_OWNER` | 무제한 | 프로젝트 전용 노드 | 없음 | O | 커스텀 사양 VM 생성 |
| `USER` | 최대 3개 | 일반 노드 (1, 2) | 30일 (연장 가능) | X | - |

- JWT Access Token: 30분, Refresh Token: 7일
- 모든 API: `Authorization: Bearer <token>` 필수
- 프로젝트 오너 가입: 관리자 승인 필요

---

## 6. VM 티어 정책

### 일반 사용자 티어

| 티어 | vCPU | RAM | Storage |
|------|------|-----|---------|
| `micro` | 1 | 2 GB | 30 GB |
| `small` | 2 | 4 GB | 40 GB |
| `medium` | 2 | 6 GB | 50 GB |
| `large` | 4 | 8 GB | 50 GB |

### 프로젝트 오너 커스텀 티어

| 항목 | 최소 | 최대 |
|------|------|------|
| vCPU (소켓) | 2 | 8 |
| RAM | 2 GB | 32 GB |
| Storage | 30 GB | 70 GB |

- 핫플러그 지원: CPU(소켓 단위), 메모리 (NUMA 활성화)
- VM 생성 후 설정 탭에서 리사이징 가능

---

## 7. 포트 할당 정책

VM당 **3개의 포트**가 VMID 기반으로 고정 할당됩니다.

**계산식:** `Server.base_port + Offset + VMID`

| 용도 | 내부 포트 | Offset | 프로토콜 |
|------|-----------|--------|----------|
| SSH | 22 | +0 | TCP |
| HTTP | 80 | +1000 | TCP |
| SVC | 10000 | +2000 | TCP + UDP |

- iptables DNAT: `-d 172.10.104.3` 지정
- VM 생성/삭제 시 자동 추가/제거

---

## 8. Cloud-Init & 스니펫 관리

```text
1. VM 클론 후 user-data YAML 동적 생성
2. SSH/SFTP로 Proxmox 노드에 업로드 (/var/lib/vz/snippets/)
3. cicustom user=local:snippets/user-data-{vmid}.yaml 적용
4. VM 부팅 (cloud-init 첫 부팅 시 1회 실행)
5. cicustom 해제 (재부팅 시 스니펫 참조 오류 방지)
6. 스니펫 파일 삭제
```

- SSH 전용 계정: `gsmsv-sni` (PVE realm과 별도)
- 노드별 SSH 포트: 10011, 10012, 10013
- MTU 1400 설정은 netplan으로 영구 적용

---

## 9. VM 만료 정책

| 역할 | 만료 기간 | 연장 조건 | 연장 기간 |
|------|-----------|-----------|-----------|
| USER | 생성 후 30일 | 만료 15일 전부터 | +30일 |
| PROJECT_OWNER | 없음 | - | - |
| ADMIN | 없음 | - | - |

- 연장 버튼: 항상 표시, 15일 이내일 때만 활성화
- 만료일은 인스턴스 개요 탭에서 D-day로 표시

---

## 10. 에러 코드

| 코드 | 상황 |
|------|------|
| `400` | 잘못된 요청 (티어 오류, 필수값 누락, 인증코드 불일치) |
| `401` | 인증 토큰 없음 또는 만료 |
| `403` | 권한 없음 (타인 VM, 노드 접근 제한) |
| `404` | VM/노드/사용자 없음 |
| `409` | VM 개수 초과 (USER 3개 제한) |
| `422` | 요청 본문 형식 오류 |
| `500` | Proxmox 연결 실패, SSH 오류 등 |
| `507` | 자원 부족으로 VM 생성 불가 |

---

## 11. 프론트엔드 페이지 구조

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 로그인 | `/login` | 이메일/비밀번호 + DataGSM OAuth |
| 일반 회원가입 | `/signup` | 학생 인증 → 이메일 인증 |
| 프로젝트 오너 가입 | `/signup/project` | 프로젝트 선택 → 관리자 승인 대기 |
| 이메일 인증 | `/verify` | 인증코드 입력 |
| 비밀번호 초기화 | `/reset-password` | 이메일 인증 → 새 비밀번호 |
| OAuth 콜백 | `/auth/callback` | DataGSM 리다이렉트 처리 |
| VM 배포 | `/deploy` | 4단계 위자드 (OS → 노드 → 사양 → 확인) |
| 인스턴스 목록 | `/instances` | VM 카드 리스트 + 상태 표시 |
| 인스턴스 상세 | `/instances/[id]` | 탭: 개요, 모니터링, 방화벽, 설정 |
| 설정 | `/settings` | 비밀번호 변경, 테마 전환 |
| 문서 | `/docs` | 사용 가이드 |

### 사이드바 구조

- **ADMIN**: NODES 섹션 (노드별 VM 그룹, 소유자 표시)
- **일반 사용자**: MY VM 섹션 (본인 VM 목록)
- **공통**: 대시보드, VM 생성, 설정, 문서

---

## 12. 향후 계획

| 기능 | 상태 |
|------|------|
| 지원 페이지 (Discord 리다이렉트) | 예정 |
| Prometheus + Grafana 연동 (어드민) | 보류 |
| Windows, CentOS 등 OS 추가 | 보류 |
| CI 기능 (웹 터미널 + 파이프라인) | 보류 |
