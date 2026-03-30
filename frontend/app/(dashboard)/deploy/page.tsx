"use client"

import { DeployWizard } from "@/components/deploy/deploy-wizard"

export default function DeployPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">새 인스턴스 생성</h1>
        <p className="text-muted-foreground">
          새로운 가상 머신을 설정하고 바로 실행할 수 있습니다.
        </p>
      </div>
      <DeployWizard />
    </div>
  )
}
