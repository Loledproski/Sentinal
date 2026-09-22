import { SystemOverview, StorageBreakdown, NetworkSecurityStatus, SecurityProcess, ToolCallResult } from '../types';

/**
 * Sentinel Tools Service
 * In web simulator mode, this returns mock data according to the architecture specification.
 * When exported to Electron, this file is connected directly to `window.electronAPI`.
 */
export const SentinelTools = {
  // 1. System Telemetry
  async getSystemOverview(): Promise<SystemOverview> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.getSystemOverview) {
      return (window as any).electronAPI.getSystemOverview();
    }
    return {
      cpuUsage: Math.floor(28 + Math.random() * 15),
      cpuTemp: 48,
      ramUsed: 9.4,
      ramTotal: 16.0,
      gpuUsage: 34,
      gpuTemp: 52,
      batteryLevel: 94,
      isCharging: true,
      status: 'OPTIMAL'
    };
  },

  // 2. Storage Analysis
  async scanStorage(): Promise<StorageBreakdown> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.scanStorage) {
      return (window as any).electronAPI.scanStorage();
    }
    return {
      totalSpaceGB: 512,
      usedSpaceGB: 342,
      freeSpaceGB: 170,
      tempFilesMB: 4820,
      cacheMB: 2340,
      duplicateFilesMB: 1980,
      largeFiles: [
        { name: 'old_installer_build_v2.iso', sizeMB: 3400, path: 'C:/Downloads/build_v2.iso', risk: 'safe' },
        { name: 'backup_archive_2025.zip', sizeMB: 4200, path: 'C:/Users/Admin/backup_2025.zip', risk: 'caution' },
        { name: 'temp_crash_dump.dmp', sizeMB: 1200, path: 'C:/Windows/Minidump/crash.dmp', risk: 'safe' }
      ]
    };
  },

  // 3. Storage Clean Action
  async cleanStorage(): Promise<ToolCallResult> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.cleanStorage) {
      return (window as any).electronAPI.cleanStorage();
    }
    return {
      tool: 'storage.cleanTempFiles',
      status: 'executed',
      message: 'Purged 4.82 GB of system temporary files, crash dumps, and browser cache.',
      data: { freedMB: 4820 }
    };
  },

  // 4. Network Security Audit
  async checkNetworkSecurity(): Promise<NetworkSecurityStatus> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.checkNetworkSecurity) {
      return (window as any).electronAPI.checkNetworkSecurity();
    }
    return {
      ssid: 'Sentinel-Secure-5G',
      encryption: 'WPA3-Personal',
      isSafe: true,
      publicIp: '185.124.90.14',
      dnsLeakDetected: false,
      firewallActive: true,
      openPorts: [443, 80, 22],
      threatsBlockedToday: 14
    };
  },

  // 5. Threat & Process Inspector
  async getProcessThreats(): Promise<SecurityProcess[]> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.getProcessThreats) {
      return (window as any).electronAPI.getProcessThreats();
    }
    return [
      { pid: 1420, name: 'sentinel-core.exe', cpu: 1.2, memoryMB: 184, status: 'verified', path: 'C:/Program Files/Sentinel/core.exe' },
      { pid: 3824, name: 'chrome.exe (24 tabs)', cpu: 14.5, memoryMB: 3420, status: 'verified', path: 'C:/Program Files/Google/Chrome/chrome.exe' },
      { pid: 7810, name: 'unknown_bg_updater.exe', cpu: 0.1, memoryMB: 28, status: 'suspicious', path: 'C:/Users/AppData/Local/Temp/updater.exe' },
      { pid: 402, name: 'svchost.exe', cpu: 0.4, memoryMB: 140, status: 'system', path: 'C:/Windows/System32/svchost.exe' }
    ];
  },

  // 6. Application Launcher
  async launchApp(appName: string, query?: string): Promise<ToolCallResult> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.launchApp) {
      return (window as any).electronAPI.launchApp(appName, query);
    }
    return {
      tool: 'system.launchApp',
      status: 'executed',
      message: `Launched ${appName.toUpperCase()}${query ? ` with query "${query}"` : ''}.`
    };
  }
};
