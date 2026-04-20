# GSMSV — Claude 프로젝트 지침서

GSMSV는 광주소프트웨어마이스터고등학교 학생들이 Proxmox VE 기반의 VM을 신청·관리할 수 있는 내부 플랫폼입니다.

---

## 🏗 기술 스택

| 레이어 | 기술 |
|--------|------|
| Backend | FastAPI (Python), SQLAlchemy (sync), PostgreSQL, Alembic |
| Frontend | Next.js 16 (App Router), TypeScript, React 19, Tailwind CSS, shadcn/ui |
| Infra | Proxmox VE, Docker, Nginx |
| Auth | JWT (access 30분 / refresh 7일), 역할 기반 (USER / PROJECT_OWNER / ADMIN) |

---

## 📁 디렉터리 구조

```
newconsole-beta/
├── api/routes/          # FastAPI 라우터 (auth, vmcontrol, firewall, monitoring, network, notifications, oauth, faq)
├── services/            # 비즈니스 로직 (vm_service, network_service, mon_service ...)
├── models/              # SQLAlchemy 모델 (User, Vm, Server, Notification ...)
├── core/                # 설정(config.py), DB(database.py), 보안(security.py) 등
├── schemas/             # Pydantic 스키마 (요청/응답 검증)
├── main.py              # FastAPI 앱 진입점, 라우터 등록, 백그라운드 태스크
├── frontend/
│   ├── app/             # Next.js App Router 페이지
│   ├── components/      # React 컴포넌트
│   └── lib/             # API 함수(api.ts), 타입(types.ts), 유틸
└── .claude/
    ├── agents/          # 서브에이전트 정의
    ├── skills/          # 슬래시 커맨드 정의
    └── hooks/           # PreToolCall / PostToolCall 훅 스크립트
```

---

## ⚙️ 개발 컨벤션

### 커밋 메시지

```
type: 한국어 설명

Co-Authored-By: Claude <noreply@anthropic.com>
```

- **콜론 앞뒤 공백 없음**: `fix: 수정` (O) / `fix : 수정` (X)
- **타입**: `feat` / `fix` / `update` / `add` / `docs` / `style` / `refactor` / `test` / `perf` / `merge`
- **설명**: 한국어, 마침표 없음
- **Co-Authored-By 반드시 포함**

### 브랜치 & PR 흐름

```
feature/xxx  →  develop (PR)  →  main (사용자가 테스트 후 수동 머지)
```

- 항상 `develop` 브랜치에서 분기
- Claude는 `main`에 직접 push 금지 — PR을 통해서만 머지
- 브랜치 네이밍: `feat/vm-snapshot-api`, `fix/path-traversal`

### PR 작성 스타일

```markdown
## Summary
- **굵은 키워드**: 변경 내용 (한국어, 기술용어는 영어)
- `파일명`, `설정값` 등은 백틱 처리

## Test plan
- [x] 자동 테스트 통과한 항목
- [ ] 수동 확인 필요 항목

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## 🔒 의도된 설계 — 절대 수정 제안 금지

아래 항목들은 보안 감사에서 발견되더라도 수정하지 않는다:

| 항목 | 이유 |
|------|------|
| VM 비밀번호 평문 반환 (`vm_password`) | overview-tab에서 사용자가 복사해야 하므로 의도적 설계 |
| Next.js 미들웨어 `/api` 우회 | 백엔드가 자체 JWT 인증하는 구조 |
| Proxmox `verify_ssl=False` | 내부 네트워크 + 자체 서명 인증서 환경 |
| Proxmox 180초 타임아웃 | VM 클론/스냅샷 등 장시간 작업 대응 |
| CORS `allow_headers=["*"]` | 동일 도메인 운영 구조 |

---

## 🧪 테스트 규칙

- **전체 테스트(`pytest tests/`) 매번 실행 금지** — 변경된 파일과 관련된 테스트만 선별 실행
- 예: `vm_service.py` 수정 → `pytest tests/test_vm_helpers.py`
- 관련 테스트가 없으면 실행 생략 가능

---

## 🤖 에이전트 사용 가이드

| 상황 | 사용할 에이전트 |
|------|---------------|
| 기능 구현 / 버그 수정 | `feature-builder` |
| 코드 리뷰 | `code-reviewer` |
| Next.js 빌드 확인 | `build-verifier` |
| pytest 실행 | `test-runner` |
| 빌드/테스트 실패 분석 + 수정 | `failure-analyst` |
| 린트/포맷 자동 수정 | `lint-fixer` |

슬래시 커맨드: `/commit`, `/new-branch`, `/code-review`, `/format`, `/new-api`, `/review-pr`, `/security-checklist`, `/test`, `/plan-deep-dive`

---

## 🛡 보안 주의사항

- 파일 경로 조작 시 반드시 `Path.resolve()` 후 허용 디렉터리 하위인지 검증
- 인증 필요 엔드포인트: `Depends(get_current_user)` 주입
- 역할 기반 접근 제어는 **서버측**에서 검증 (프론트 UI 숨김만으로 대체 불가)
- 민감 필드(password, token 제외 — vm_password는 예외) 응답에 노출 금지
- `HTTPException` 직접 사용 (서브클래스 생성 X)

---

## 🖥 주요 도메인 정보

- **서비스 도메인**: `gsmsv.site` (웹), `ssh.gsmsv.site` (포트포워딩), `service.gsmsv.site` (Vultr VPC)
- **Proxmox 노드**: `.env`의 `NODE_1_*`, `NODE_2_*`, `NODE_3_*` 설정
- **프로젝트 오너 전용 노드**: `settings.PROJECT_NODE_NAME` (기본 `gsmgpu3`)
- **VM 티어**: BASIC / STANDARD / ADVANCED / PROJECT_CUSTOM
- **업로드 경로**: `uploads/avatars/` (Docker volume `gsmsv_uploads`로 마운트)
