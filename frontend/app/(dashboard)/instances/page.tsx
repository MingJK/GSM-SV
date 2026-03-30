import { InstancesTable } from "@/components/instances/instances-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default function InstancesPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">인스턴스</h1>
          <p className="text-muted-foreground">
            가상 머신 및 클라우드 리소스를 관리합니다.
          </p>
        </div>
        <Link href="/deploy">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            인스턴스 생성
          </Button>
        </Link>
      </div>

      {/* Table */}
      <InstancesTable />
    </div>
  )
}
