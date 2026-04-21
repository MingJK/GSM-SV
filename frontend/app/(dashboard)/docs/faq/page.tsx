"use client"

import { DocsLayout } from "@/components/docs/docs-layout"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

const faqItems = [
  {
    question: "VM을 몇 개까지 만들 수 있나요?",
    answer: (
      <p>
        일반 사용자(USER)는 최대 <strong>3개</strong>까지 생성할 수 있습니다.
        프로젝트 오너(PROJECT_OWNER)와 관리자(ADMIN)는 개수 제한이 없습니다.
      </p>
    ),
  },
  {
    question: "VM이 만료되면 어떻게 되나요?",
    answer: (
      <p>
        일반 사용자의 VM은 생성 후 30일이 지나면 만료됩니다.
        만료 15일 전부터 인스턴스 페이지에서 +30일 연장 버튼이 활성화됩니다.
        만료 이후에는 VM이 자동으로 삭제되니, 기간 내에 연장하거나 데이터를 백업해 두세요.
      </p>
    ),
  },
  {
    question: "DataGSM OAuth로 로그인하면 기존 계정과 연동되나요?",
    answer: (
      <p>
        네. DataGSM OAuth 로그인 시 <strong>같은 이메일</strong>의 기존 계정이 있으면 자동으로 연동됩니다.
      </p>
    ),
  },
  {
    question: "비밀번호를 잊어버렸어요.",
    answer: (
      <p>
        로그인 페이지에서 <strong>비밀번호 초기화</strong>를 선택하세요.
        가입한 이메일로 6자리 인증코드가 발송되며, 인증 후 새 비밀번호를 설정할 수 있습니다.
      </p>
    ),
  },
  {
    question: "SSH 접속이 안 돼요.",
    answer: (
      <div>
        <p className="mb-2">아래 사항을 순서대로 확인해 주세요.</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>인스턴스 상세 페이지에서 VM이 <strong className="text-foreground">실행 중(Running)</strong> 상태인지 확인합니다.</li>
          <li>SSH 포트 번호가 올바른지 확인합니다. (기본 22가 아닌 할당된 포트 사용)</li>
          <li>접속 명령어 형식을 확인합니다: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ssh ubuntu@ssh.gsmsv.site -p &lt;포트&gt;</code></li>
        </ol>
      </div>
    ),
  },
  {
    question: "지원 가능한 OS는 무엇인가요?",
    answer: (
      <p>
        현재는 <strong>Ubuntu 22.04 LTS (Cloud Image)</strong>만 지원합니다.
        향후 다른 OS 추가가 검토되고 있습니다.
      </p>
    ),
  },
  {
    question: "VM 어떤 사양을 쓰는 게 좋을까요?",
    answer: (
      <div>
        <p className="mb-3">용도에 따라 추천 사양이 달라집니다.</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <strong className="text-foreground shrink-0">Micro</strong>
            <span>(1 vCPU / 2 GB) — 리눅스 명령어 학습, 간단한 스크립트 실행 등 가벼운 용도에 적합합니다.</span>
          </div>
          <div className="flex items-start gap-2">
            <strong className="text-foreground shrink-0">Small</strong>
            <span>(2 vCPU / 4 GB) — 웹 서버, DB 등 기본적인 서비스를 올려보며 공부하기에 좋습니다.</span>
          </div>
          <div className="flex items-start gap-2">
            <strong className="text-foreground shrink-0">Medium</strong>
            <span>(2 vCPU / 6 GB) — Docker 컨테이너를 띄우거나 여러 서비스를 동시에 운영해보고 싶을 때 추천합니다.</span>
          </div>
          <div className="flex items-start gap-2">
            <strong className="text-foreground shrink-0">Large</strong>
            <span>(4 vCPU / 8 GB) — 빌드가 무거운 프로젝트나 다수의 컨테이너를 운영할 때 적합합니다.</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          💡 처음이라면 Micro로 시작해서, 필요에 따라 새로운 VM을 더 높은 사양으로 만들어 보세요.
        </p>
      </div>
    ),
  },
  {
    question: "VM 리소스가 부족해요. 업그레이드할 수 있나요?",
    answer: (
      <p>
        일반 사용자는 사양 변경이 불가합니다. 장기 프로젝트나 더 많은 리소스가 필요한 경우,
        프로젝트 오너 계정 신청을 고려해 보세요.
        프로젝트 오너는 최대 8vCPU, 32GB RAM, 70GB Storage까지 설정할 수 있습니다.
      </p>
    ),
  },
]

export default function FaqPage() {
  return (
    <DocsLayout>
      <h1>FAQ</h1>
      <p className="text-muted-foreground mb-6">
        자주 묻는 질문을 모았습니다. 항목을 클릭하면 답변을 확인할 수 있습니다.
      </p>

      <Accordion type="multiple" className="w-full">
        {faqItems.map((item, idx) => (
          <AccordionItem key={idx} value={`faq-${idx}`}>
            <AccordionTrigger className="text-[15px]">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </DocsLayout>
  )
}
