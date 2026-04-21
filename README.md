# GSMSV

광주소프트웨어마이스터고등학교 학생들이 Proxmox VE 기반 VM을 신청·관리할 수 있는 내부 플랫폼입니다.

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Backend | FastAPI, SQLAlchemy, PostgreSQL, Alembic |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Infra | Proxmox VE, Docker, Nginx |
| Auth | JWT, 역할 기반 (USER / PROJECT_OWNER / ADMIN) |

## 주요 기능

- VM 신청 및 승인 워크플로우
- VM 시작·중지·재시작·삭제 등 생명주기 관리
- 실시간 리소스 모니터링
- 포트포워딩(방화벽) 규칙 관리
- 프로젝트 오너 전용 GPU 노드 VM 지원
- 어드민 대시보드 (사용자·VM·서버 관리, 가입 승인)
- 알림 시스템

## 서비스 도메인

- 웹: `gsmsv.site`
- SSH 포트포워딩: `ssh.gsmsv.site`
