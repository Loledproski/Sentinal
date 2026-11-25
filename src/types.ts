export interface SystemOverview {
  cpuUsage: number;
  cpuTemp: number;
  cpuModel?: string;
  cpuCores?: Array<{ core: string; load: number }>;
  ramUsed: number;
  ramTotal: number;
  ramAvailable?: number;
  gpuUsage: number;
  gpuTemp: number;
  gpuModel?: string;
  batteryLevel: number;
  isCharging: boolean;
  diskReadMBs?: number;
  diskWriteMBs?: number;
  netDownMBs?: number;
  netUpMBs?: number;
  platform?: string;
  isLiveBackend?: boolean;
  status: 'OPTIMAL' | 'ELEVATED' | 'CRITICAL';
}

export interface CleanableCategoryDetail {
  id: 'downloads' | 'cache' | 'temp' | 'duplicates';
  name: string;
  description: string;
  targetPath: string;
  reason: string;
  sizeMB: number;
  fileCount: number;
  risk: 'safe' | 'caution';
  sampleFiles: Array<{ name: string; path: string; sizeMB: number }>;
}

export interface StorageBreakdown {
  totalSpaceGB: number;
  usedSpaceGB: number;
  freeSpaceGB: number;
  tempFilesMB: number;
  cacheMB: number;
  duplicateFilesMB: number;
  largeFiles: Array<{ name: string; sizeMB: number; path: string; risk: 'safe' | 'caution' | 'system' }>;
  cleanableCategories?: CleanableCategoryDetail[];
  directories?: Array<{
    id: string;
    name: string;
    path: string;
    sizeGB: number;
  }>;
  isLiveBackend?: boolean;
}

export interface NetworkSecurityStatus {
  ssid: string;
  encryption: 'WPA3-Personal' | 'WPA2-AES' | 'OPEN-UNSECURE' | string;
  isSafe: boolean;
  publicIp: string;
  localIp?: string;
  gatewayIp?: string;
  dnsLeakDetected: boolean;
  firewallActive: boolean;
  openPorts: number[];
  portDetails?: Array<{
    port: number;
    protocol: string;
    service: string;
    processName?: string;
    pid?: number;
    state: string;
  }>;
  threatsBlockedToday: number;
  linkSpeedMbps?: number;
  isLiveBackend?: boolean;
}

export interface SecurityProcess {
  pid: number;
  name: string;
  cpu: number;
  memoryMB: number;
  status: 'verified' | 'suspicious' | 'system' | 'quarantined';
  path: string;
  canBoost?: boolean;
}

export interface RamBoostResult {
  beforeUsedGB: number;
  afterUsedGB: number;
  freedMB: number;
  trimmedProcessesCount: number;
  closedProcesses: Array<{ pid: number; name: string; freedMB: number }>;
  timestamp: string;
  method: string;
  message: string;
}

export interface SystemPermissionsState {
  granted: boolean;
  mode: 'full' | 'readonly' | 'unconfigured';
  token: string | null;
  scopes: {
    hardwareTelemetry: boolean;
    storageAnalyzer: boolean;
    networkFirewall: boolean;
    processAndRamBoost: boolean;
  };
  browserCapabilities?: {
    storageEstimateSupported: boolean;
    batteryApiSupported: boolean;
    networkInfoSupported: boolean;
    deviceMemoryGB?: number;
    logicalCores?: number;
  };
  platformName?: string;
}

export interface ToolCallResult {
  tool: string;
  status: 'executed' | 'pending_confirmation' | 'failed';
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
  data?: any;
  message: string;
}
