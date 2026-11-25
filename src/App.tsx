import { motion } from 'motion/react';
import {
  Mic,
  MicOff,
  Shield,
  Globe,
  Database,
  TrendingUp,
  Send,
  HardDrive,
  Lock,
} from 'lucide-react';
import { useJarvis } from './lib/useJarvis';
import { useFpsCounter } from './lib/useFpsCounter';
import { useState, useEffect, useCallback } from 'react';
import { SentinelModals, DiagnosticScreenType } from './components/SentinelModals';
import { PermissionModal } from './components/PermissionModal';
import { OmenOverlay } from './components/OmenOverlay';
import { SentinelTools } from './services/tools';
import { routeUserCommand } from './ai/orchestrator';
import {
  StorageBreakdown,
  NetworkSecurityStatus,
  SecurityProcess,
  SystemOverview,
  SystemPermissionsState,
  RamBoostResult,
} from './types';

export default function App() {
  const { fps, frameTimeMs } = useFpsCounter(true);
  const [time, setTime] = useState(new Date());
  const [activeModal, setActiveModal] = useState<DiagnosticScreenType | null>(null);
  const [pendingModal, setPendingModal] = useState<DiagnosticScreenType | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const [commandInput, setCommandInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>("I'm online and ready.");
  const [subMessage, setSubMessage] = useState<string>('Grant Windows API access or speak a command to begin.');
  const [lastRamBoost, setLastRamBoost] = useState<RamBoostResult | null>(null);

  const { isConnected, volume, error, toggleConnection } = useJarvis({
    onVoiceCommand: (transcript) => {
      const lower = transcript.toLowerCase();
      if (
        lower.includes('boost') ||
        lower.includes('ram') ||
        lower.includes('memory') ||
        lower.includes('clean') ||
        lower.includes('scan') ||
        lower.includes('storage') ||
        lower.includes('network') ||
        lower.includes('wifi') ||
        lower.includes('threat') ||
        lower.includes('process') ||
        lower.includes('insight') ||
        lower.includes('status')
      ) {
        handleCommandSubmit(transcript);
      } else {
        setStatusMessage(`VOICE: "${transcript.toUpperCase()}"`);
      }
    },
    onModelTranscript: (reply) => {
      setSubMessage(reply);
    },
  });

  const [permissions, setPermissions] = useState<SystemPermissionsState>({
    granted: false,
    mode: 'unconfigured',
    token: null,
    scopes: {
      hardwareTelemetry: true,
      storageAnalyzer: true,
      networkFirewall: true,
      processAndRamBoost: true,
    },
  });

  // Live Data States
  const [storageData, setStorageData] = useState<StorageBreakdown>({
    totalSpaceGB: 512,
    usedSpaceGB: 342,
    freeSpaceGB: 170,
    tempFilesMB: 4820,
    cacheMB: 2340,
    duplicateFilesMB: 1980,
    largeFiles: [
      { name: 'old_installer_build_v2.iso', sizeMB: 3400, path: 'C:/Downloads/build_v2.iso', risk: 'safe' },
      { name: 'backup_archive_2025.zip', sizeMB: 4200, path: 'C:/Users/Admin/backup_2025.zip', risk: 'caution' },
      { name: 'temp_crash_dump.dmp', sizeMB: 1200, path: 'C:/Windows/Minidump/crash.dmp', risk: 'safe' },
    ],
  });

  const [networkData, setNetworkData] = useState<NetworkSecurityStatus>({
    ssid: 'Sentinel-Secure-5G',
    encryption: 'WPA3-Personal',
    isSafe: true,
    publicIp: '185.124.90.14',
    dnsLeakDetected: false,
    firewallActive: true,
    openPorts: [443, 80, 22],
    threatsBlockedToday: 14,
  });

  const [threatsData, setThreatsData] = useState<SecurityProcess[]>([
    { pid: 1420, name: 'sentinel-core.exe', cpu: 1.2, memoryMB: 184, status: 'verified', path: 'C:/Program Files/Sentinel/core.exe', canBoost: false },
    { pid: 3824, name: 'chrome.exe (18 background tabs)', cpu: 14.5, memoryMB: 1420, status: 'verified', path: 'C:/Program Files/Google/Chrome/chrome.exe', canBoost: true },
    { pid: 7810, name: 'unknown_bg_updater.exe', cpu: 2.1, memoryMB: 310, status: 'suspicious', path: 'C:/Users/AppData/Local/Temp/updater.exe', canBoost: true },
    { pid: 402, name: 'svchost.exe', cpu: 0.4, memoryMB: 140, status: 'system', path: 'C:/Windows/System32/svchost.exe', canBoost: false },
  ]);

  const [systemData, setSystemData] = useState<SystemOverview>({
    cpuUsage: 32,
    cpuTemp: 48,
    ramUsed: 9.4,
    ramTotal: 16.0,
    gpuUsage: 34,
    gpuTemp: 52,
    batteryLevel: 94,
    isCharging: true,
    status: 'OPTIMAL',
  });

  // Sync all 4 telemetry domains from the real backend / browser APIs
  const refreshAllTelemetry = useCallback(async () => {
    try {
      const [overview, storage, network, procs] = await Promise.all([
        SentinelTools.getSystemOverview(),
        SentinelTools.scanStorage(),
        SentinelTools.checkNetworkSecurity(),
        SentinelTools.getProcessThreats(),
      ]);
      setSystemData(overview);
      setStorageData(storage);
      setNetworkData(network);
      setThreatsData(procs);
    } catch {}
  }, []);

  const refreshFastOverview = useCallback(async () => {
    try {
      const [overview, procs] = await Promise.all([
        SentinelTools.getSystemOverview(),
        SentinelTools.getProcessThreats(),
      ]);
      setSystemData(overview);
      setThreatsData(procs);
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleOverlay = useCallback(() => {
    const electronApi = (window as any).electronAPI;
    if (electronApi?.toggleDesktopOverlay) {
      electronApi.toggleDesktopOverlay();
      return;
    }
    setOverlayVisible((prev) => !prev);
  }, []);

  // Global Shift + F3 Keyboard Shortcut & Electron IPC Overlay Toggle
  useEffect(() => {
    const electronApi = (window as any).electronAPI;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'F3' || e.code === 'F3')) {
        e.preventDefault();
        // In Electron, globalShortcut('Shift+F3') handles toggling the native floating overlay window
        if (!electronApi?.isElectron) {
          setOverlayVisible((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (electronApi?.onOverlayToggle) {
      electronApi.onOverlayToggle((_event: any, forcedState?: boolean) => {
        if (typeof forcedState === 'boolean') {
          setOverlayVisible(forcedState);
        } else {
          setOverlayVisible((prev) => !prev);
        }
      });
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Poll live backend telemetry while permission is granted
  useEffect(() => {
    if (!permissions.granted) return;
    refreshAllTelemetry();
    const id = setInterval(() => {
      refreshFastOverview();
    }, 3500);
    return () => clearInterval(id);
  }, [permissions.granted, refreshAllTelemetry, refreshFastOverview]);

  const handleOpenScreenWithPermissionGate = (screen: DiagnosticScreenType) => {
    if (!permissions.granted) {
      setPendingModal(screen);
      setShowPermissionModal(true);
      return;
    }
    setActiveModal(screen);
  };

  const handleGrantPermissions = async (
    mode: 'full' | 'readonly',
    scopes: SystemPermissionsState['scopes']
  ) => {
    const grantedState = await SentinelTools.requestSystemPermissions(mode, scopes);
    setPermissions(grantedState);
    await refreshAllTelemetry();
    setStatusMessage('WINDOWS API CONNECTED');
    setSubMessage(
      `Live hardware & OS telemetry active (${grantedState.platformName || 'Local Host'}).`
    );

    if (pendingModal) {
      setActiveModal(pendingModal);
      setPendingModal(null);
    }
  };

  const handleRevokePermissions = async () => {
    await SentinelTools.revokeSystemPermissions();
    setPermissions((prev) => ({
      ...prev,
      granted: false,
      mode: 'unconfigured',
      token: null,
    }));
    setStatusMessage('PERMISSIONS REVOKED');
    setSubMessage('Disconnected from live Windows/OS telemetry bridge.');
  };

  const handleRunRamBoost = async (options: {
    trimWorkingSets: boolean;
    targetPids: number[];
  }): Promise<RamBoostResult> => {
    const result = await SentinelTools.boostRam(options);
    setLastRamBoost(result);
    await refreshFastOverview();
    setStatusMessage('OMEN RAM BOOST EXECUTED');
    setSubMessage(
      `Reclaimed ${(result.freedMB / 1024).toFixed(2)} GB (${result.freedMB} MB) · RAM dropped ${result.beforeUsedGB.toFixed(1)} GB → ${result.afterUsedGB.toFixed(1)} GB.`
    );
    return result;
  };

  const handleCommandSubmit = async (queryText?: string) => {
    const text = queryText || commandInput;
    if (!text.trim()) return;

    setCommandInput('');
    setStatusMessage(`ROUTING: "${text.toUpperCase()}"`);
    setSubMessage('AI Orchestrator analyzing intent & selecting tool...');

    const decision = await routeUserCommand(text);

    setTimeout(async () => {
      // Auto-prompt permission if not granted yet when invoking system tools
      if (!permissions.granted && decision.tool && decision.tool !== 'launchApp') {
        const autoGranted = await SentinelTools.requestSystemPermissions('full', permissions.scopes);
        setPermissions(autoGranted);
        await refreshAllTelemetry();
      }

      setStatusMessage('ACTION EXECUTED');
      setSubMessage(decision.explanation);

      if (decision.tool === 'boostRam') {
        setActiveModal('INSIGHTS');
        await handleRunRamBoost({ trimWorkingSets: true, targetPids: [] });
      } else if (decision.tool === 'scanStorage' || decision.tool === 'cleanStorage') {
        await refreshAllTelemetry();
        setActiveModal('SCAN');
      } else if (decision.tool === 'checkNetworkSecurity') {
        await refreshAllTelemetry();
        setActiveModal('NETWORK');
      } else if (decision.tool === 'getProcessThreats') {
        await refreshAllTelemetry();
        setActiveModal('THREATS');
      } else if (decision.tool === 'getSystemOverview') {
        await refreshAllTelemetry();
        setActiveModal('INSIGHTS');
      } else if (decision.tool === 'launchApp') {
        await SentinelTools.launchApp(decision.args?.appName || 'Chrome');
      }
    }, 450);
  };

  const handleCleanItems = async (freedMB: number, clearedIds: string[]) => {
    const result = await SentinelTools.cleanStorage(clearedIds, freedMB);
    const freedGB = freedMB / 1024;
    setStorageData((prev) => ({
      ...prev,
      tempFilesMB: clearedIds.includes('temp') ? 0 : prev.tempFilesMB,
      cacheMB: clearedIds.includes('cache') ? 0 : prev.cacheMB,
      duplicateFilesMB: clearedIds.includes('duplicates') ? 0 : prev.duplicateFilesMB,
      freeSpaceGB: +(prev.freeSpaceGB + freedGB).toFixed(2),
      usedSpaceGB: +Math.max(0, prev.usedSpaceGB - freedGB).toFixed(2),
    }));
    setStatusMessage('STORAGE OPTIMIZED');
    setSubMessage(freedGB > 0 ? `Freed ${freedGB.toFixed(2)} GB from C:\\ Drive.` : result.message);
  };

  const handleDeleteLargeFile = async (fileName: string, sizeMB: number) => {
    await SentinelTools.deleteLargeFile(fileName, sizeMB);
    const freedGB = sizeMB / 1024;
    setStorageData((prev) => ({
      ...prev,
      largeFiles: prev.largeFiles.filter((f) => f.name !== fileName),
      freeSpaceGB: +(prev.freeSpaceGB + freedGB).toFixed(2),
      usedSpaceGB: +Math.max(0, prev.usedSpaceGB - freedGB).toFixed(2),
    }));
    setStatusMessage('FILE REMOVED');
    setSubMessage(`Deleted ${fileName} and reclaimed ${freedGB.toFixed(2)} GB.`);
  };

  const handleToggleFirewall = async () => {
    const nextActive = !networkData.firewallActive;
    setNetworkData((prev) => ({ ...prev, firewallActive: nextActive }));
    await SentinelTools.toggleFirewall(nextActive);
    setStatusMessage(nextActive ? 'FIREWALL ACTIVE' : 'FIREWALL PAUSED');
    setSubMessage(
      nextActive
        ? 'Intrusion shield re-engaged across all interfaces.'
        : 'Packet filtering is temporarily disabled.'
    );
  };

  const handleTogglePort = async (port: number) => {
    const updated = await SentinelTools.togglePort(port);
    if (updated) {
      setNetworkData(updated);
    } else {
      setNetworkData((prev) => {
        const exists = prev.openPorts.includes(port);
        const nextPorts = exists
          ? prev.openPorts.filter((p) => p !== port)
          : [...prev.openPorts, port].sort((a, b) => a - b);
        return { ...prev, openPorts: nextPorts };
      });
    }
  };

  const handleQuarantineProcess = async (pid: number) => {
    const updatedList = await SentinelTools.updateProcessStatus(pid, 'quarantine');
    if (updatedList) {
      setThreatsData(updatedList);
    } else {
      setThreatsData((prev) =>
        prev.map((proc) => (proc.pid === pid ? { ...proc, status: 'quarantined' } : proc))
      );
    }
    setStatusMessage('THREAT QUARANTINED');
    setSubMessage(`Isolated PID ${pid} inside Sentinel secure vault.`);
  };

  const handleTrustProcess = async (pid: number) => {
    const updatedList = await SentinelTools.updateProcessStatus(pid, 'trust');
    if (updatedList) {
      setThreatsData(updatedList);
    } else {
      setThreatsData((prev) =>
        prev.map((proc) => (proc.pid === pid ? { ...proc, status: 'verified' } : proc))
      );
    }
    setStatusMessage('PROCESS VERIFIED');
    setSubMessage(`PID ${pid} marked as trusted and signed.`);
  };

  const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = time
    .toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#02050A] text-cyan-500 font-sans flex flex-col items-center justify-center overflow-hidden relative select-none">
      {/* HUD Corners */}
      <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-cyan-800/50" />
      <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-cyan-800/50" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-cyan-800/50" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-cyan-800/50" />

      {/* Header Left */}
      <div className="absolute top-8 left-8 flex items-center gap-4">
        <Shield className="text-cyan-500 w-12 h-12 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
        <div className="flex flex-col">
          <h1 className="text-cyan-400 tracking-[0.3em] text-3xl font-semibold drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
            SENTINEL
          </h1>
          <p className="text-cyan-600 text-xs tracking-[0.2em] mt-1">AI CYBERSECURITY GUARDIAN</p>
        </div>
      </div>

      {/* Header Right */}
      <div className="absolute top-8 right-8 flex flex-col items-end">
        <div className="text-cyan-400 text-3xl tracking-widest font-light">{timeString}</div>
        <div className="text-cyan-700 text-sm tracking-widest mb-3 mt-1">{dateString}</div>
        <button
          type="button"
          onClick={() => setShowPermissionModal(true)}
          className={`inline-flex items-center gap-2 border rounded-full px-5 py-2 transition-colors cursor-pointer ${
            permissions.granted
              ? 'border-cyan-800/50 bg-[#030B14] text-cyan-400 hover:border-cyan-500'
              : 'border-amber-700/60 bg-amber-950/30 text-amber-300 hover:border-amber-500'
          }`}
        >
          {permissions.granted ? (
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          <span className="text-xs tracking-widest font-medium whitespace-nowrap">
            {permissions.granted ? 'SECURE' : 'GRANT SYSTEM ACCESS'}
          </span>
        </button>
      </div>

      {/* Bottom Left Status */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-1.5">
        <div className="text-cyan-700 text-xs tracking-widest">SYSTEM TELEMETRY</div>
        <div className="inline-flex items-center gap-3 text-xs tracking-wider text-cyan-400">
          <span>CPU {systemData.cpuUsage}%</span>
          <span>·</span>
          <span>
            RAM {systemData.ramUsed}/{systemData.ramTotal} GB
          </span>
          <span>·</span>
          <span>{permissions.granted ? 'LIVE KERNEL' : 'SANDBOX'}</span>
        </div>
      </div>

      {/* Right Sidebar Nav (Click to open diagnostic utility suite) */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-10 z-20">
        {[
          { icon: HardDrive, label: 'SCAN', modal: 'SCAN' as const },
          { icon: Globe, label: 'NETWORK', modal: 'NETWORK' as const },
          { icon: Database, label: 'THREATS', modal: 'THREATS' as const },
          { icon: TrendingUp, label: 'INSIGHTS', modal: 'INSIGHTS' as const },
        ].map((item, idx) => (
          <div
            key={idx}
            onClick={() => handleOpenScreenWithPermissionGate(item.modal)}
            className="flex items-center gap-4 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full border border-cyan-800/50 flex items-center justify-center bg-[#030B14] group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all">
              <item.icon className="w-6 h-6 text-cyan-600 group-hover:text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-cyan-500 text-xs tracking-widest group-hover:text-cyan-300 transition-colors">
                {item.label}
              </span>
              <div className="w-2 h-2 rounded-full bg-cyan-800 mt-1.5 group-hover:bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0)] group-hover:shadow-[0_0_5px_rgba(6,182,212,0.8)] transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* Center UI */}
      <div className="flex flex-col items-center justify-center z-10 w-full max-w-4xl mt-[-5vh]">
        {/* Glowing Orb */}
        <div className="relative w-[420px] h-[420px] flex items-center justify-center mb-12">
          <div className="absolute inset-0 rounded-full bg-cyan-500/5 blur-[80px]" />

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 border border-cyan-900/50 rounded-full border-t-cyan-500/80 border-r-cyan-500/30"
          />

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-4 border-[2px] border-dashed border-cyan-800/40 rounded-full border-l-cyan-400/60"
          />

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-10 border-2 border-cyan-500/20 rounded-full shadow-[inset_0_0_30px_rgba(6,182,212,0.1)] border-b-cyan-400/80"
          />

          <div className="absolute inset-16 border-[4px] border-dotted border-cyan-700/30 rounded-full" />

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h2 className="text-6xl font-light tracking-[0.3em] text-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">
              SENTINEL
            </h2>
            <p className="text-[11px] tracking-[0.3em] text-cyan-600 mt-4">
              AI CYBERSECURITY GUARDIAN
            </p>
          </div>

          <div className="absolute -bottom-2 w-64 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-[2px] opacity-50" />
          <div className="absolute -bottom-2 w-32 h-1 bg-cyan-300 blur-[8px] opacity-70" />
        </div>

        {/* Status Text & Audio Waveform */}
        <div className="flex flex-col items-center mb-10 h-28">
          <h3 className="text-cyan-100 text-2xl tracking-wide font-light mb-3">
            {error ? 'SYSTEM ERROR' : statusMessage}
          </h3>
          <p className="text-cyan-500 text-lg tracking-wide mb-8 text-center max-w-2xl">
            {error ? error : subMessage}
          </p>

          {/* Audio Visualizer Simulator */}
          <div className="flex items-center justify-center gap-2 h-8">
            {Array.from({ length: 40 }).map((_, i) => {
              const centerDist = Math.abs(i - 20);
              const maxH = 32 - centerDist * 1.5;
              const isAnim = isConnected && volume > 0;
              const h = isAnim
                ? Math.max(4, Math.random() * maxH * (volume * 10))
                : centerDist < 10
                ? 4
                : 2;

              return (
                <motion.div
                  key={i}
                  animate={{ height: h }}
                  transition={{ type: 'tween', duration: 0.1 }}
                  className="w-1.5 bg-cyan-600 rounded-full opacity-70 shadow-[0_0_5px_rgba(6,182,212,0.5)]"
                  style={{ minHeight: '2px' }}
                />
              );
            })}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCommandSubmit();
          }}
          className="w-full max-w-3xl relative group mt-2"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-900/0 via-cyan-800/20 to-cyan-900/0 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center bg-[#030B14] border border-cyan-800/60 rounded-full p-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <button
              type="button"
              onClick={toggleConnection}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isConnected
                  ? 'bg-cyan-500/20 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] text-cyan-300'
                  : 'bg-cyan-950 border border-cyan-800/50 text-cyan-600 hover:text-cyan-400 hover:border-cyan-600'
              }`}
            >
              {isConnected ? (
                <Mic className="w-6 h-6 animate-pulse" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </button>

            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder={
                isConnected
                  ? 'Listening for voice...'
                  : "Speak or type command (e.g. 'boost ram', 'clean storage', 'check wifi')..."
              }
              className="flex-1 bg-transparent border-none outline-none text-cyan-100 placeholder-cyan-700 px-6 text-base tracking-wide font-light"
            />

            <button
              type="submit"
              className="w-14 h-14 rounded-full flex items-center justify-center text-cyan-600 hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </form>

        {/* Suggestions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm">
          <span className="text-cyan-700 tracking-widest">Try saying:</span>
          <span
            onClick={() => handleCommandSubmit('boost ram')}
            className="text-cyan-400 font-medium tracking-wide cursor-pointer hover:text-cyan-200 transition-colors"
          >
            "Boost RAM"
          </span>
          <span className="text-cyan-800">·</span>
          <span
            onClick={() => handleCommandSubmit('clean storage')}
            className="text-cyan-500 tracking-wide cursor-pointer hover:text-cyan-300 transition-colors"
          >
            "Free up space"
          </span>
          <span className="text-cyan-800">·</span>
          <span
            onClick={() => handleCommandSubmit('check network security')}
            className="text-cyan-500 tracking-wide cursor-pointer hover:text-cyan-300 transition-colors"
          >
            "Is this Wi-Fi safe?"
          </span>
          <span className="text-cyan-800">·</span>
          <span
            onClick={() => handleCommandSubmit('check process threats')}
            className="text-cyan-500 tracking-wide cursor-pointer hover:text-cyan-300 transition-colors"
          >
            "Scan background threats"
          </span>
        </div>
      </div>

      {/* OMEN Gaming Hub In-Game Performance Overlay (Shift + F3) */}
      <OmenOverlay
        visible={overlayVisible}
        systemData={systemData}
        fps={fps}
        onClickOverlay={() => handleOpenScreenWithPermissionGate('INSIGHTS')}
        onCloseOverlay={() => setOverlayVisible(false)}
      />

      {/* Active Diagnostic Utility Suite */}
      {activeModal && (
        <SentinelModals
          type={activeModal}
          onClose={() => setActiveModal(null)}
          onSwitchScreen={(screen) => setActiveModal(screen)}
          onOpenPermissions={() => setShowPermissionModal(true)}
          onCleanItems={handleCleanItems}
          onDeleteLargeFile={handleDeleteLargeFile}
          onToggleFirewall={handleToggleFirewall}
          onTogglePort={handleTogglePort}
          onQuarantineProcess={handleQuarantineProcess}
          onTrustProcess={handleTrustProcess}
          onRunRamBoost={handleRunRamBoost}
          onRefreshTelemetry={refreshFastOverview}
          fps={fps}
          frameTimeMs={frameTimeMs}
          overlayVisible={overlayVisible}
          onToggleOverlay={handleToggleOverlay}
          permissions={permissions}
          lastRamBoost={lastRamBoost}
          storageData={storageData}
          networkData={networkData}
          threatsData={threatsData}
          systemData={systemData}
        />
      )}

      {/* Windows API & Hardware Access Permission Modal */}
      {showPermissionModal && (
        <PermissionModal
          permissions={permissions}
          onGrant={handleGrantPermissions}
          onRevoke={handleRevokePermissions}
          onClose={() => {
            setShowPermissionModal(false);
            setPendingModal(null);
          }}
        />
      )}
    </div>
  );
}
