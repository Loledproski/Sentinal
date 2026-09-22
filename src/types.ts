export interface SystemOverview {
  cpuUsage: number;
  cpuTemp: number;
  ramUsed: number;
  ramTotal: number;
  gpuUsage: number;
  gpuTemp: number;
  batteryLevel: number;
  isCharging: boolean;
  status: 'OPTIMAL' | 'ELEVATED' | 'CRITICAL';
}

export interface StorageBreakdown {
  totalSpaceGB: number;
  usedSpaceGB: number;
  freeSpaceGB: number;
  tempFilesMB: number;
  cacheMB: number;
  duplicateFilesMB: number;
  largeFiles: Array<{ name: string; sizeMB: number; path: string; risk: 'safe' | 'caution' | 'system' }>;
}

export interface NetworkSecurityStatus {
  ssid: string;
  encryption: 'WPA3-Personal' | 'WPA2-AES' | 'OPEN-UNSECURE';
  isSafe: boolean;
  publicIp: string;
  dnsLeakDetected: boolean;
  firewallActive: boolean;
  openPorts: number[];
  threatsBlockedToday: number;
}

export interface SecurityProcess {
  pid: number;
  name: string;
  cpu: number;
  memoryMB: number;
  status: 'verified' | 'suspicious' | 'system';
  path: string;
}

export interface ToolCallResult {
  tool: string;
  status: 'executed' | 'pending_confirmation' | 'failed';
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
  data?: any;
  message: string;
}
