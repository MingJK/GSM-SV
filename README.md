# Proxmox Web Console

FastAPI + proxmoxer를 사용한 Proxmox VE 웹 관리 콘솔.

## 📋 목차

1. [기능](#기능)
2. [설치 방법](#설치-방법)
3. [사용 방법](#사용-방법)
4. [파일 설명](#파일-설명)
5. [문제 해결](#문제-해결)

---

## ✨ 기능

- ✅ Proxmox 노드 목록 조회
- ✅ 가상 머신(VM) 목록 조회 및 상태 확인
- ✅ 컨테이너(LXC) 목록 조회 및 상태 확인
- ✅ VM/컨테이너 시작, 중지, 재시작
- ✅ 실시간 리소스 사용량 모니터링
- ✅ 직관적인 웹 UI

---

## 🚀 설치 방법

### 1. 패키지 설치

```bash
pip install -r requirements.txt
```

### 2. 연결 테스트

먼저 Proxmox 서버와 연결이 되는지 테스트하세요:

```bash
python test_connection.py
```

화면의 안내에 따라 입력하면:
- Proxmox IP 주소
- 포트 번호 (기본: 8006)
- 사용자 계정 (예: root@pam)
- 비밀번호 또는 API 토큰

연결 성공 시 .env 파일 형식을 알려줍니다.

### 3. 환경변수 설정

`.env.example` 파일을 복사해서 `.env` 파일을 만드세요:

```bash
cp .env.example .env
```

그리고 `.env` 파일을 편집해서 실제 정보를 입력:

```bash
PROXMOX_HOST=192.168.1.100
PROXMOX_PORT=8006
PROXMOX_USER=root@pam
PROXMOX_PASSWORD=your-password
```

**⚠️ 중요:**
- realm을 반드시 포함해야 합니다 (`@pam` 또는 `@pve`)
- `.env` 파일은 절대 git에 커밋하지 마세요!

---

## 💻 사용 방법

### 백엔드 서버 실행

```bash
python main.py
```

서버가 `http://localhost:8000` 에서 실행됩니다.

### 프론트엔드 웹 페이지 열기

**방법 1: 직접 열기**
- `index.html` 파일을 브라우저에서 직접 열기

**방법 2: 간단한 HTTP 서버 사용 (권장)**
```bash
# Python 내장 서버 사용
python -m http.server 3000
```

그리고 브라우저에서 `http://localhost:3000` 접속

---

## 📁 파일 설명

### 필수 파일

| 파일 | 설명 | 주요 기능 |
|------|------|----------|
| `main.py` | FastAPI 백엔드 서버 | Proxmox API를 웹 API로 제공 |
| `index.html` | 웹 프론트엔드 | 사용자 인터페이스 |
| `requirements.txt` | 필요한 Python 패키지 목록 | pip install 용 |
| `.env` | 환경변수 설정 (직접 생성) | Proxmox 연결 정보 |

### 보조 파일

| 파일 | 설명 | 용도 |
|------|------|------|
| `test_connection.py` | 연결 테스트 스크립트 | 설정 확인 및 문제 해결 |
| `.env.example` | 환경변수 예시 파일 | .env 파일 작성 가이드 |
| `env_config.py` | 환경변수 로드 유틸리티 | 코드에서 환경변수 쉽게 사용 |

---

## 🔧 문제 해결

### 1. "root@pam으로 로그인이 안 돼요"

**원인:** realm이 다를 수 있습니다.

**해결 방법:**
1. Proxmox 웹 UI 로그인 화면 확인
2. **Realm** 드롭다운 메뉴에서 뭘 선택하는지 확인:
   - "Linux PAM" → `root@pam` 사용
   - "Proxmox VE" → `root@pve` 사용

3. `test_connection.py`로 다시 테스트:
   ```bash
   python test_connection.py
   ```

### 2. "Connection refused" 에러

**원인:** 서버에 접속할 수 없음

**해결 방법:**
1. IP 주소가 정확한지 확인
2. 포트 번호가 맞는지 확인
3. Proxmox 서버가 켜져 있는지 확인
4. 방화벽 설정 확인:
   ```bash
   # 포트 확인
   telnet 192.168.1.100 8006
   ```

### 3. "Authentication failed" 에러

**원인:** 계정 정보가 틀림

**해결 방법:**
1. 웹 UI에서 로그인 테스트
2. realm 확인 (`@pam` 또는 `@pve`)
3. 비밀번호 재확인

### 4. 포트가 8006이 아닌 경우

**상황:** `https://192.168.1.100:8007` 로 접속하는 경우

**해결 방법:**
`.env` 파일에 포트 명시:
```bash
PROXMOX_HOST=192.168.1.100
PROXMOX_PORT=8007  # 사용하는 포트 번호
PROXMOX_USER=root@pam
PROXMOX_PASSWORD=password
```

### 5. CORS 에러

**원인:** 브라우저에서 API 호출이 차단됨

**해결 방법:**
- `index.html`을 직접 여는 대신 HTTP 서버로 서빙:
  ```bash
  python -m http.server 3000
  ```

---

## 🔐 보안 권장 사항

### 개발 환경
- ✅ `.env` 파일에 비밀번호 저장
- ✅ `.gitignore`에 `.env` 추가
- ✅ `verify_ssl=False` 사용 가능

### 프로덕션 환경
- ⚠️ API 토큰 사용 (비밀번호 대신)
- ⚠️ HTTPS 사용
- ⚠️ CORS 설정을 특정 도메인만 허용
- ⚠️ Rate Limiting 추가
- ⚠️ 사용자 인증/인가 시스템 구축

---

## 📚 API 문서

서버 실행 후 자동 생성된 API 문서를 확인할 수 있습니다:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🐛 버그 리포트 및 기여

문제가 발생하거나 개선 아이디어가 있으면:
1. 이슈 등록
2. Pull Request 제출

---

## 📄 라이센스

MIT License

---

## 🎯 다음 단계

현재 구현된 기능 외에 추가할 수 있는 기능들:

- [ ] VM 생성/삭제
- [ ] 스냅샷 관리
- [ ] 백업/복원
- [ ] 네트워크 설정
- [ ] 스토리지 관리
- [ ] 사용자 권한 관리
- [ ] 실시간 콘솔 (VNC/SPICE)
- [ ] 대시보드 차트/그래프
- [ ] 모바일 반응형 UI
- [ ] 다크 모드