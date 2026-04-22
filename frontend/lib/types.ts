/**
 * 프론트엔드 공통 타입 정의
 */

export type InstanceStatus = "running" | "stopped" | "pending" | "error"

export interface Instance {
  vmid: number
  name: string
  status: InstanceStatus
  node: string
  cpu: string
  ram: string
  disk: string
  ip: string
  uptime: string
  os: string
  created: string
  // API에서 가져온 원본 데이터
  internal_ip?: string
  vm_password?: string
  public_ip?: string
  cpu_usage?: number
  mem_usage?: number
  maxmem?: number
  maxdisk?: number
  uptime_seconds?: number
  expires_at?: string
  provisioning?: boolean
}
