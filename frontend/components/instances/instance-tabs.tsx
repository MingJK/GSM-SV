"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OverviewTab } from "./tabs/overview-tab"
import { MetricsTab } from "./tabs/metrics-tab"
import { FirewallTab } from "./tabs/firewall-tab"
import { SettingsTab } from "./tabs/settings-tab"
import type { Instance } from "@/lib/types"
import type { PortInfo } from "@/lib/api"

const tabTriggerClass =
  "relative h-11 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"

export function InstanceTabs({
  instance,
  ports = [],
}: {
  instance: Instance
  ports?: PortInfo[]
}) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="h-11 w-full justify-start rounded-none border-b border-border bg-transparent p-0 overflow-x-auto">
        <TabsTrigger value="overview" className={tabTriggerClass}>
          개요
        </TabsTrigger>
        <TabsTrigger value="metrics" className={tabTriggerClass}>
          모니터링
        </TabsTrigger>
        <TabsTrigger value="firewall" className={tabTriggerClass}>
          방화벽
        </TabsTrigger>
        <TabsTrigger value="settings" className={tabTriggerClass}>
          설정
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <OverviewTab instance={instance} ports={ports} />
      </TabsContent>

      <TabsContent value="metrics" className="mt-6">
        <MetricsTab instance={instance} />
      </TabsContent>

      <TabsContent value="firewall" className="mt-6">
        <FirewallTab instance={instance} ports={ports} />
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <SettingsTab instance={instance} />
      </TabsContent>
    </Tabs>
  )
}
