"use client"

import { DocsLayout } from "@/components/docs/docs-layout"

export default function AdvancedResourcesPage() {
  return (
    <DocsLayout>
      <h1>Public IP / GPU 안내</h1>

      <p>
        GSM SV는 기본 제공 리소스 외에도 특정 목적에 한해 <strong>Public IP</strong>와 <strong>GPU</strong>를
        추가로 제공하고 있습니다. 두 리소스 모두 공유 자원이므로 사용 사유를 검토한 후 관리자가 직접 배정합니다.
      </p>

      <h2>Public IP</h2>
      <p>
        기본 VM은 NAT 방식으로 외부 접속이 이루어집니다. 포트포워딩(SSH, HTTP, SVC)이 자동 할당되지만,
        서비스 특성상 고정 Public IP가 필요한 경우 별도로 신청할 수 있습니다.
        현재 제공 가능한 공인 IP는 <strong>총 7개</strong>로 수량이 한정되어 있습니다.
      </p>
      <ul>
        <li>도메인 직접 연결이 필요한 경우</li>
        <li>특정 포트 외 다수의 포트를 외부에 열어야 하는 경우</li>
        <li>고정 IP가 필요한 프로토콜을 사용하는 경우</li>
      </ul>

      <h2>GPU</h2>
      <p>
        머신러닝, 딥러닝, 영상 처리 등 GPU 연산이 필요한 작업을 위해 GPU 리소스를 신청할 수 있습니다.
        각 서버에는 <strong>NVIDIA RTX Quadro 5000이 4개</strong>씩 장착되어 있으며,
        교육·연구 목적에 한해 우선 배정됩니다.
      </p>
      <ul>
        <li>모델 학습 및 추론</li>
        <li>컴퓨터 비전, NLP 등 AI 프로젝트</li>
        <li>영상·이미지 처리가 포함된 교내 프로젝트</li>
      </ul>

      <h2>신청 방법</h2>
      <p>
        관리자에게 직접 문의하면 사용 사유를 검토한 후 제공드립니다. <br />
        Discord ming._.jun으로 연락해주시거나 웹 문의를 통해 신청해주시면 감사하겠습니다.
      </p>
    </DocsLayout>
  )
}
