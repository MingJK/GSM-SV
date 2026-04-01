"use client"

import { DocsLayout } from "@/components/docs/docs-layout"

export default function FirewallPage() {
  return (
    <DocsLayout>
      <h1>방화벽 설정</h1>

      <h2>방화벽이란?</h2>
      <p>
        방화벽은 VM으로 들어오는(인바운드) 트래픽을 제어하는 보안 기능입니다.
        허용된 IP 대역에서만 특정 포트에 접근할 수 있도록 규칙을 설정할 수 있습니다.
      </p>
      <blockquote>
        <p>
          방화벽 규칙은 포트포워딩된 포트(SSH, HTTP, SVC)에 대해서만 설정할 수 있습니다.
          포트포워딩되지 않은 포트에 규칙을 추가해도 외부에서 접근할 수 없습니다.
        </p>
      </blockquote>

      <h2>포트포워딩 구조</h2>
      <p>VM 생성 시 세 개의 포트가 자동으로 할당됩니다.</p>
      <table>
        <thead>
          <tr>
            <th>서비스</th>
            <th>VM 내부 포트</th>
            <th>외부 포트</th>
            <th>설명</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SSH</td>
            <td>22</td>
            <td>자동 할당</td>
            <td>SSH 접속용</td>
          </tr>
          <tr>
            <td>HTTP</td>
            <td>80</td>
            <td>자동 할당</td>
            <td>웹 서비스용</td>
          </tr>
          <tr>
            <td>SVC</td>
            <td>10000</td>
            <td>자동 할당</td>
            <td>커스텀 서비스용</td>
          </tr>
        </tbody>
      </table>
      <p>
        방화벽 규칙은 이 세 포트에 대해서만 의미가 있습니다.
        할당된 외부 포트 번호는 인스턴스 상세 페이지 → <strong>개요 탭</strong>에서 확인하세요.
      </p>

      <h2>규칙 추가</h2>
      <p>인스턴스 상세 페이지 → <strong>방화벽 탭</strong>에서 규칙을 관리합니다.</p>
      <ol>
        <li><strong>규칙 추가</strong> 버튼을 클릭합니다.</li>
        <li>아래 항목을 입력합니다.</li>
      </ol>
      <table>
        <thead>
          <tr>
            <th>항목</th>
            <th>설명</th>
            <th>예시</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Source</strong></td>
            <td>허용할 IP 또는 CIDR 대역</td>
            <td><code>192.168.1.0/24</code></td>
          </tr>
          <tr>
            <td><strong>프로토콜</strong></td>
            <td>TCP 또는 UDP</td>
            <td>TCP</td>
          </tr>
          <tr>
            <td><strong>포트</strong></td>
            <td>포트포워딩된 포트 중 선택</td>
            <td>22 (SSH)</td>
          </tr>
          <tr>
            <td><strong>동작</strong></td>
            <td>허용(ACCEPT) 또는 차단(DROP)</td>
            <td>허용</td>
          </tr>
        </tbody>
      </table>
      <blockquote>
        <p>Source를 비워두면 <code>0.0.0.0/0</code> (모든 IP)으로 설정됩니다.</p>
      </blockquote>

      <h2>사용 예시</h2>
      <blockquote>
        <p>아래 IP 주소는 예시입니다. 실제 환경에 맞는 IP 대역을 사용하세요.</p>
      </blockquote>

      <h3>특정 IP에서만 SSH 허용</h3>
      <p>교내 네트워크(10.0.0.0/8)에서만 SSH 접속을 허용하고 나머지는 차단합니다.</p>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>프로토콜</th>
            <th>포트</th>
            <th>동작</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>10.0.0.0/8</code></td>
            <td>TCP</td>
            <td>22</td>
            <td>허용</td>
          </tr>
          <tr>
            <td><code>0.0.0.0/0</code></td>
            <td>TCP</td>
            <td>22</td>
            <td>차단</td>
          </tr>
        </tbody>
      </table>

      <h3>웹 서비스는 전체 공개, SSH는 제한</h3>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>프로토콜</th>
            <th>포트</th>
            <th>동작</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>(전체)</td>
            <td>TCP</td>
            <td>80</td>
            <td>허용</td>
          </tr>
          <tr>
            <td><code>192.168.0.0/24</code></td>
            <td>TCP</td>
            <td>22</td>
            <td>허용</td>
          </tr>
        </tbody>
      </table>

      <h2>규칙 삭제</h2>
      <p>
        방화벽 탭의 규칙 목록에서 휴지통 아이콘을 클릭하면 해당 규칙이 삭제됩니다.
      </p>
      <blockquote>
        <p>규칙이 없는 상태에서는 기본적으로 모든 트래픽이 허용됩니다.</p>
      </blockquote>

      <h2>주의 사항</h2>
      <ul>
        <li>방화벽 규칙은 <strong>인바운드(들어오는 트래픽)</strong>에만 적용됩니다.</li>
        <li>규칙 순서(우선순위)에 따라 먼저 매칭되는 규칙이 적용됩니다.</li>
        <li>SSH 포트를 실수로 차단하면 접속이 불가능해질 수 있으니 주의하세요.</li>
        <li>포트포워딩되지 않은 포트(예: 8080)에 규칙을 추가해도 외부에서 접근할 수 없습니다.</li>
      </ul>
    </DocsLayout>
  )
}
