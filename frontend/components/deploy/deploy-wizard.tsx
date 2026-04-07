"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import {
  Check,
  Server,
  HardDrive,
  Monitor,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Loader2,
  Copy,
  Cpu,
  MemoryStick,
  Network,
  Settings2,
} from "lucide-react"
import { createVm, getNodesResources, ApiError, type VmCreateResponse, type NodeResources } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useNotifications } from "@/lib/notification-context"

const steps = [
  { id: 1, name: "운영체제", icon: Monitor },
  { id: 2, name: "노드 선택", icon: Network },
  { id: 3, name: "사양 선택", icon: Server },
  { id: 4, name: "최종 확인", icon: Rocket },
]

const osOptions = [
  {
    id: "ubuntu2204",
    name: "Ubuntu 22.04 LTS",
    desc: "안정적인 리눅스 서버 환경",
    icon: "/os_ubuntu.png",
    tag: "추천",
  },
]

const nodeOptions = [
  {
    id: "gsmgpu1",
    name: "GSM GPU 1",
    desc: "일반 사용자용 서버",
    roles: ["user", "admin"],
  },
  {
    id: "gsmgpu2",
    name: "GSM GPU 2",
    desc: "일반 사용자용 서버",
    roles: ["user", "admin"],
  },
  {
    id: "gsmgpu3",
    name: "GSM GPU 3",
    desc: "프로젝트 전용 서버",
    roles: ["project_owner", "admin"],
  },
]

const tiers = [
  { id: "micro",  name: "Micro",  cpu: "1 vCPU", memory: "2 GB",  disk: "30 GB", roles: ["user", "admin", "project_owner"] },
  { id: "small",  name: "Small",  cpu: "2 vCPU", memory: "4 GB",  disk: "40 GB", roles: ["user", "admin", "project_owner"] },
  { id: "medium", name: "Medium", cpu: "2 vCPU", memory: "6 GB",  disk: "50 GB", roles: ["user", "admin", "project_owner"] },
  { id: "large",  name: "Large",  cpu: "4 vCPU", memory: "8 GB",  disk: "50 GB", roles: ["user", "admin", "project_owner"] },
  { id: "project_custom", name: "Custom", cpu: "최대 8 vCPU", memory: "최대 32 GB", disk: "최대 70 GB", roles: ["project_owner", "admin"] },
]

// Custom tier limits
const CUSTOM_LIMITS = {
  cores: { min: 2, max: 8, step: 2 },
  memory: { min: 2, max: 32, step: 2 },   // GB 단위 (UI), MB 변환은 전송 시
  disk: { min: 30, max: 70, step: 5 },
}

export function DeployWizard() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedOs, setSelectedOs] = useState("")
  const [selectedNode, setSelectedNode] = useState("")
  const [selectedTier, setSelectedTier] = useState("")
  const [hostname, setHostname] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<VmCreateResponse | null>(null)
  const { addNotification } = useNotifications()

  // Custom tier 스펙 상태
  const [customCores, setCustomCores] = useState(2)
  const [customMemory, setCustomMemory] = useState(2)   // GB
  const [customDisk, setCustomDisk] = useState(50)       // GB

  const [nodeResources, setNodeResources] = useState<Record<string, NodeResources>>({})

  useEffect(() => {
    getNodesResources().then(setNodeResources).catch(() => {})
  }, [])

  const userRole = user?.role ?? "user"

  // 역할에 따라 선택 가능한 노드/티어 필터링
  const availableNodes = nodeOptions.filter((n) => n.roles.includes(userRole))
  const availableTiers = tiers.filter((t) => t.roles.includes(userRole))

  // RAM 사용률이 가장 낮은 노드 = 추천
  const recommendedNodeId = availableNodes.reduce<string | null>((best, node) => {
    const res = nodeResources[node.id]
    if (!res?.online || !res.mem_total_gb) return best
    const percent = res.mem_used_gb! / res.mem_total_gb!
    const bestRes = best ? nodeResources[best] : null
    if (!bestRes?.online || !bestRes.mem_total_gb) return node.id
    const bestPercent = bestRes.mem_used_gb! / bestRes.mem_total_gb!
    return percent < bestPercent ? node.id : best
  }, null)

  const isCustomTier = selectedTier === "project_custom"

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedOs
      case 2: return !!selectedNode
      case 3: return !!selectedTier
      case 4: return true
      default: return false
    }
  }

  const selectedTierData = tiers.find((t) => t.id === selectedTier)
  const selectedOsData = osOptions.find((o) => o.id === selectedOs)
  const selectedNodeData = nodeOptions.find((n) => n.id === selectedNode)

  // 구성 요약에 표시할 스펙
  const displaySpecs = isCustomTier
    ? { cpu: `${customCores} vCPU`, memory: `${customMemory} GB`, disk: `${customDisk} GB` }
    : selectedTierData
    ? { cpu: selectedTierData.cpu, memory: selectedTierData.memory, disk: selectedTierData.disk }
    : null

  const handleCreate = async () => {
    setCreating(true)
    setError("")
    try {
      const res = await createVm({
        tier: selectedTier as "micro" | "small" | "medium" | "large" | "project_custom",
        os: selectedOs as "ubuntu2204",
        node_name: selectedNode,
        name: hostname || undefined,
        ...(isCustomTier && {
          custom_cores: customCores,
          custom_memory: customMemory * 1024,  // GB → MB
          custom_disk: customDisk,
        }),
      })
      setResult(res)
      addNotification("success", `VM ${res.name || hostname}이(가) 생성되었습니다.`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail)
        addNotification("error", `VM 생성 실패: ${err.detail}`)
      } else {
        setError("인스턴스 생성 중 오류가 발생했습니다.")
        addNotification("error", "VM 생성 중 오류가 발생했습니다.")
      }
    } finally {
      setCreating(false)
    }
  }

  // 생성 완료 화면
  if (result) {
    return (
      <Card className="max-w-4xl mx-auto w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-active-bg)]">
              <Check className="h-8 w-8 text-[var(--status-active-fg)]" />
            </div>
          </div>
          <CardTitle className="text-2xl">인스턴스 생성 완료!</CardTitle>
          <CardDescription>{result.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-semibold">접속 정보</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">노드</p>
                <p className="font-mono font-medium">{result.assigned_node}</p>
              </div>
              <div>
                <p className="text-muted-foreground">내부 IP</p>
                <p className="font-mono font-medium">{result.internal_ip}</p>
              </div>
              <div>
                <p className="text-muted-foreground">SSH 계정</p>
                <p className="font-mono font-medium">{result.ssh_user}</p>
              </div>
              <div>
                <p className="text-muted-foreground">SSH 비밀번호</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-medium">{result.ssh_password}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => navigator.clipboard.writeText(result.ssh_password)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => router.push("/instances")}>
              인스턴스 목록
            </Button>
            <Button onClick={() => router.push(`/instances/${result.vmid}?node=${result.assigned_node}`)}>
              인스턴스 관리
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Steps Sidebar */}
      <Card className="lg:col-span-1 h-fit">
        <CardContent className="p-4">
          <nav className="space-y-1">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep

              return (
                <button
                  key={step.id}
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors",
                    isActive && "bg-neutral-200 text-foreground dark:bg-neutral-700",
                    isCompleted && "text-muted-foreground hover:bg-muted cursor-pointer",
                    !isActive && !isCompleted && "text-muted-foreground/50 cursor-not-allowed"
                  )}
                  disabled={!isCompleted && !isActive}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                    isActive && "bg-neutral-700 text-white dark:bg-neutral-300 dark:text-neutral-900",
                    isCompleted && "bg-[var(--status-active-bg)] text-[var(--status-active-fg)]",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  <span className="font-medium">{step.name}</span>
                </button>
              )
            })}
          </nav>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        {/* Step 1: OS 선택 */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>운영체제 선택</CardTitle>
              <CardDescription>
                인스턴스에 설치할 운영체제를 선택하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedOs} onValueChange={setSelectedOs}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {osOptions.map((os) => (
                    <label
                      key={os.id}
                      onDoubleClick={() => { setSelectedOs(os.id); setCurrentStep(2) }}
                      className={cn(
                        "relative flex flex-col gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all select-none",
                        selectedOs === os.id
                          ? "border-neutral-400 bg-neutral-100 dark:border-neutral-500 dark:bg-neutral-800"
                          : "border-border hover:border-neutral-400 dark:hover:border-neutral-500"
                      )}
                    >
                      <RadioGroupItem value={os.id} className="sr-only" />
                      <div className="flex items-center justify-between">
                        <img src={os.icon} alt={os.name} className="h-9 w-9 rounded-full object-cover" />
                        <div className="flex items-center gap-2">
                          {os.tag && (
                            <Badge variant="secondary" className="text-xs bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300 border-0">
                              {os.tag}
                            </Badge>
                          )}
                          {selectedOs === os.id && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-500 dark:bg-gray-400">
                              <Check className="h-3.5 w-3.5 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{os.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{os.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Step 2: 노드 선택 */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>노드 선택</CardTitle>
              <CardDescription>
                인스턴스를 배포할 서버 노드를 선택하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedNode} onValueChange={setSelectedNode}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableNodes.map((node) => (
                    <label
                      key={node.id}
                      onDoubleClick={() => { setSelectedNode(node.id); setCurrentStep(3) }}
                      className={cn(
                        "relative flex flex-col gap-3 p-5 rounded-xl border-2 cursor-pointer transition-all select-none",
                        selectedNode === node.id
                          ? "border-neutral-400 bg-neutral-100 dark:border-neutral-500 dark:bg-neutral-800"
                          : "border-border hover:border-neutral-400 dark:hover:border-neutral-500"
                      )}
                    >
                      <RadioGroupItem value={node.id} className="sr-only" />
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Server className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex items-center gap-2">
                          {recommendedNodeId === node.id && (
                            <Badge variant="secondary" className="text-xs bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300 border-0">
                              추천
                            </Badge>
                          )}
                          {node.id === "gsmgpu3" && (
                            <Badge variant="secondary" className="text-xs bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300 border-0">
                              프로젝트 전용
                            </Badge>
                          )}
                          {selectedNode === node.id && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-500 dark:bg-gray-400">
                              <Check className="h-3.5 w-3.5 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{node.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{node.desc}</p>
                      </div>
                      {/* 리소스 사용량 */}
                      {nodeResources[node.id] && nodeResources[node.id].online ? (
                        <div className="space-y-2 mt-1">
                          {[
                            { label: "CPU", percent: nodeResources[node.id].cpu_percent ?? 0, value: `${nodeResources[node.id].cpu_percent}%` },
                            { label: "RAM", percent: nodeResources[node.id].mem_total_gb ? Math.round((nodeResources[node.id].mem_used_gb! / nodeResources[node.id].mem_total_gb!) * 100) : 0, value: `${nodeResources[node.id].mem_used_gb}/${nodeResources[node.id].mem_total_gb} GB` },
                            { label: "SSD", percent: nodeResources[node.id].disk_total_gb ? Math.round((nodeResources[node.id].disk_used_gb! / nodeResources[node.id].disk_total_gb!) * 100) : 0, value: `${nodeResources[node.id].disk_used_gb}/${nodeResources[node.id].disk_total_gb} GB` },
                          ].map((r) => (
                            <div key={r.label} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-muted-foreground">{r.label}</span>
                                <span className="text-[11px] font-semibold text-foreground">{r.value}</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    r.percent >= 70 ? "bg-red-500" : r.percent >= 50 ? "bg-yellow-500" : "bg-gray-500 dark:bg-gray-400"
                                  )}
                                  style={{ width: `${Math.min(r.percent, 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : nodeResources[node.id] && !nodeResources[node.id].online ? (
                        <div className="mt-1 text-xs text-destructive font-medium">오프라인</div>
                      ) : null}
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Step 3: 사양 선택 */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>사양 선택</CardTitle>
              <CardDescription>
                인스턴스의 컴퓨팅 리소스를 선택하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={selectedTier} onValueChange={setSelectedTier}>
                <div className="space-y-3">
                  {availableTiers.map((tier) => (
                    <label
                      key={tier.id}
                      onDoubleClick={() => { if (tier.id !== "project_custom") { setSelectedTier(tier.id); setCurrentStep(4) } }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all select-none",
                        selectedTier === tier.id
                          ? "border-neutral-400 bg-neutral-100 dark:border-neutral-500 dark:bg-neutral-800"
                          : "border-border hover:border-neutral-400 dark:hover:border-neutral-500"
                      )}
                    >
                      <RadioGroupItem value={tier.id} className="sr-only" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-semibold">{tier.name}</Badge>
                          {tier.id === "project_custom" && (
                            <Badge variant="secondary" className="text-xs bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300 border-0">
                              프로젝트 전용
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Cpu className="h-3.5 w-3.5" />
                            <span>{tier.cpu}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MemoryStick className="h-3.5 w-3.5" />
                            <span>{tier.memory}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <HardDrive className="h-3.5 w-3.5" />
                            <span>{tier.disk}</span>
                          </div>
                        </div>
                      </div>
                      {selectedTier === tier.id && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-500 dark:bg-gray-400 shrink-0">
                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </RadioGroup>

              {/* Custom 스펙 슬라이더 */}
              {isCustomTier && (
                <div className="mt-2 space-y-6 rounded-xl border border-border bg-muted/30 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Settings2 className="h-4 w-4" />
                    커스텀 리소스 설정
                  </div>

                  {/* vCPU */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                        vCPU
                      </Label>
                      <span className="text-sm font-semibold tabular-nums">{customCores} Core</span>
                    </div>
                    <Slider
                      value={[customCores]}
                      onValueChange={([v]) => setCustomCores(v)}
                      min={CUSTOM_LIMITS.cores.min}
                      max={CUSTOM_LIMITS.cores.max}
                      step={CUSTOM_LIMITS.cores.step}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{CUSTOM_LIMITS.cores.min}</span>
                      <span>{CUSTOM_LIMITS.cores.max}</span>
                    </div>
                  </div>

                  {/* RAM */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5">
                        <MemoryStick className="h-3.5 w-3.5 text-muted-foreground" />
                        RAM
                      </Label>
                      <span className="text-sm font-semibold tabular-nums">{customMemory} GB</span>
                    </div>
                    <Slider
                      value={[customMemory]}
                      onValueChange={([v]) => setCustomMemory(v)}
                      min={CUSTOM_LIMITS.memory.min}
                      max={CUSTOM_LIMITS.memory.max}
                      step={CUSTOM_LIMITS.memory.step}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{CUSTOM_LIMITS.memory.min} GB</span>
                      <span>{CUSTOM_LIMITS.memory.max} GB</span>
                    </div>
                  </div>

                  {/* Disk */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5">
                        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                        Storage
                      </Label>
                      <span className="text-sm font-semibold tabular-nums">{customDisk} GB</span>
                    </div>
                    <Slider
                      value={[customDisk]}
                      onValueChange={([v]) => setCustomDisk(v)}
                      min={CUSTOM_LIMITS.disk.min}
                      max={CUSTOM_LIMITS.disk.max}
                      step={CUSTOM_LIMITS.disk.step}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{CUSTOM_LIMITS.disk.min} GB</span>
                      <span>{CUSTOM_LIMITS.disk.max} GB</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: 최종 확인 */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>최종 확인 및 생성</CardTitle>
              <CardDescription>
                설정 내용을 확인하고 인스턴스 이름을 입력하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="hostname">인스턴스 이름 (선택)</Label>
                <Input
                  id="hostname"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, ""))}
                  placeholder="미입력 시 자동 생성"
                />
                <p className="text-xs text-muted-foreground">영어, 숫자, 하이픈(-)만 사용 가능합니다.</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">구성 요약</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">운영체제</p>
                    <p className="font-medium">{selectedOsData?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">노드</p>
                    <p className="font-medium">{selectedNodeData?.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">등급</p>
                    <p className="font-medium">{selectedTierData?.name}</p>
                  </div>
                  {displaySpecs && (
                    <>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">CPU / 메모리</p>
                        <p className="font-medium">{displaySpecs.cpu} / {displaySpecs.memory}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">디스크</p>
                        <p className="font-medium">{displaySpecs.disk}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 1 || creating}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
              className="gap-2"
            >
              다음 단계
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  인스턴스 생성
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
