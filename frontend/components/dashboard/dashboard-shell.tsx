import { Sidebar } from "./sidebar"
import { TopNavbar } from "./top-navbar"

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-sidebar">
      <Sidebar />
      <div className="pl-64">
        <div className="min-h-screen bg-background rounded-tl-2xl">
          <TopNavbar />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
