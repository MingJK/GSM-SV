"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Zap,
  HardDrive,
  Terminal,
  KeyRound,
  Shield,
  FolderKanban,
  MessageCircleQuestion,
  ChevronRight,
  BookOpen,
} from "lucide-react"

const sections = [
  {
    title: "시작하기",
    href: "/docs/getting-started",
    icon: Zap,
    description: "GSM SV 소개, 제공 기능, 계정 유형",
    items: ["GSM SV에 대하여", "제공 기능", "계정 유형 (USER / PROJECT_OWNER)"],
  },
  {
    title: "인스턴스",
    href: "/docs/instances",
    icon: HardDrive,
    description: "VM 생성, 전원 제어, 만료 연장, 삭제",
    items: ["VM 생성 위자드 (4단계)", "티어별 사양", "전원 제어", "만료 및 연장"],
  },
  {
    title: "접속 방법",
    href: "/docs/access",
    icon: Terminal,
    description: "SSH 접속, 포트 구조, 웹 서비스 접속",
    items: ["포트 구조 (SSH / HTTP / SVC)", "SSH 접속 가이드", "웹 서비스 & SVC 포트 활용"],
  },
  {
    title: "SSH Key 등록",
    href: "/docs/ssh-key",
    icon: KeyRound,
    description: "SSH Key 생성, 등록, VS Code 설정",
    items: ["SSH Key 생성 방법", "VM에 공개키 등록", "VS Code Remote SSH 설정"],
  },
  {
    title: "방화벽 설정",
    href: "/docs/firewall",
    icon: Shield,
    description: "인바운드 방화벽 규칙 추가, 삭제",
    items: ["포트포워딩 구조", "규칙 추가 방법", "사용 예시 (IP 제한)"],
  },
  {
    title: "프로젝트 오너",
    href: "/docs/project-owner",
    icon: FolderKanban,
    description: "프로젝트 오너 권한, 가입 절차, 핫플러그",
    items: ["일반 사용자와의 차이점", "가입 방법", "핫플러그 리사이징"],
  },
  {
    title: "FAQ",
    href: "/docs/faq",
    icon: MessageCircleQuestion,
    description: "자주 묻는 질문과 답변",
    items: ["VM 개수 제한", "SSH 접속 문제", "비밀번호 초기화", "OS 지원 현황"],
  },
]

export default function DocsPage() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Documentation</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          GSM SV Console의 사용 방법을 안내합니다. VM 생성부터 접속, 관리까지 필요한 모든 정보를 확인하세요.
        </p>
      </div>

      {/* Quick Start Banner */}
      <Link href="/docs/getting-started">
        <Card className="bg-primary/5 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">GSM SV 시작하기</p>
                <p className="text-sm text-muted-foreground">플랫폼 소개, 제공 기능, 계정 유형을 확인하세요.</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.slice(1).map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Icon className="h-4 w-4 text-primary" />
                    {section.title}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/50 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
