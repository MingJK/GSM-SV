"use client"

import { DocsLayout } from "@/components/docs/docs-layout"

export default function InstancesPage() {
  return (
    <DocsLayout>
      <h1>인스턴스</h1>

      <h2>VM 생성</h2>
      <p>VM 생성은 <code>/deploy</code> 페이지에서 4단계 위자드로 진행합니다.</p>
      <ol>
        <li><strong>OS 선택</strong> — 현재 Ubuntu 22.04 LTS (Cloud Image)를 지원합니다.</li>
        <li><strong>노드 선택</strong> — 사용 가능한 노드와 현재 리소스 사용률(CPU / RAM / SSD)을 게이지바로 확인하고 선택합니다.</li>
        <li><strong>사양(티어) 선택</strong> — 아래 티어 중 하나를 선택합니다.</li>
        <li><strong>확인</strong> — 입력한 정보를 최종 확인하고 생성을 요청합니다.</li>
      </ol>

      <h3>VM 티어 — 일반 사용자(USER)</h3>
      <table>
        <thead>
          <tr>
            <th>티어</th>
            <th>vCPU</th>
            <th>RAM</th>
            <th>Storage</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>micro</td><td>1</td><td>2 GB</td><td>30 GB</td></tr>
          <tr><td>small</td><td>2</td><td>4 GB</td><td>40 GB</td></tr>
          <tr><td>medium</td><td>2</td><td>6 GB</td><td>50 GB</td></tr>
          <tr><td>large</td><td>4</td><td>8 GB</td><td>50 GB</td></tr>
        </tbody>
      </table>

      <h3>VM 티어 — 프로젝트 오너(PROJECT_OWNER)</h3>
      <p>커스텀 사양을 직접 설정할 수 있습니다.</p>
      <table>
        <thead>
          <tr>
            <th>항목</th>
            <th>최소</th>
            <th>최대</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>vCPU (소켓)</td><td>2</td><td>8</td></tr>
          <tr><td>RAM</td><td>2 GB</td><td>32 GB</td></tr>
          <tr><td>Storage</td><td>30 GB</td><td>70 GB</td></tr>
        </tbody>
      </table>
      <blockquote>
        <p>VM 이름은 <strong>영어와 숫자만</strong> 사용할 수 있습니다.</p>
      </blockquote>

      <h2>VM 생성 시 초기 접속 정보</h2>
      <p>
        VM 생성이 완료되면 초기 비밀번호가 랜덤으로 생성됩니다.
        인스턴스 상세 페이지에서 마스킹된 비밀번호를 토글하여 확인할 수 있습니다.
      </p>
      <blockquote>
        <p><strong>주의:</strong> SSH root 로그인은 기본적으로 비활성화되어 있습니다. 초기 접속 계정은 <code>ubuntu</code>입니다.</p>
      </blockquote>

      <h2>전원 제어</h2>
      <p>인스턴스 상세 페이지에서 다음 동작을 수행할 수 있습니다.</p>
      <ul>
        <li><strong>시작(Start)</strong> — VM을 켭니다.</li>
        <li><strong>종료(Shutdown)</strong> — VM을 정상 종료합니다.</li>
        <li><strong>강제종료(Stop)</strong> — VM을 즉시 강제 종료합니다.</li>
        <li><strong>재시작(Reboot)</strong> — VM을 재시작합니다.</li>
      </ul>

      <h2>만료 및 연장</h2>
      <p>
        일반 사용자(USER) VM은 생성 후 <strong>30일</strong>이 지나면 만료됩니다.
        만료 <strong>15일 전</strong>부터 인스턴스 상세 페이지에서 <strong>+30일 연장</strong> 버튼이 활성화됩니다.
      </p>
      <blockquote>
        <p>PROJECT_OWNER와 ADMIN의 VM은 만료 기간이 없습니다.</p>
      </blockquote>

      <h2>VM 삭제</h2>
      <p>
        인스턴스 상세 페이지 또는 인스턴스 목록의 메뉴에서 VM을 삭제할 수 있습니다.
        삭제 시 VM 정지 → Proxmox에서 삭제 → 포트포워딩 규칙 제거 → DB 삭제가 순서대로 진행됩니다.
      </p>
      <blockquote>
        <p>삭제된 VM은 복구할 수 없습니다.</p>
      </blockquote>
    </DocsLayout>
  )
}
