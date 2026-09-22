import React, { useState } from 'react';
import { Shield, HardDrive, Wifi, Activity, X, Trash2, CheckCircle2, AlertTriangle, Play, RefreshCw } from 'lucide-react';
import { StorageBreakdown, NetworkSecurityStatus, SecurityProcess, SystemOverview } from '../types';

interface ModalProps {
  type: 'SCAN' | 'NETWORK' | 'THREATS' | 'INSIGHTS';
  onClose: () => void;
  onRunAction?: (toolName: string) => void;
  storageData: StorageBreakdown;
  networkData: NetworkSecurityStatus;
  threatsData: SecurityProcess[];
  systemData: SystemOverview;
}

export const SentinelModals: React.FC<ModalProps> = ({
  type,
  onClose,
  onRunAction,
  storageData,
  networkData,
  threatsData,
  systemData,
}) => {
  const [cleaning, setCleaning] = useState(false);
  const [cleaned, setCleaned] = useState(false);

  const handleClean = () => {
    setCleaning(true);
    setTimeout(() => {
      setCleaning(false);
      setCleaned(true);
      if (onRunAction) onRunAction('cleanStorage');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#010408]/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#030B14] border border-cyan-800/80 rounded-2xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-900/40 pb-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              {type === 'SCAN' && <HardDrive className="w-6 h-6" />}
              {type === 'NETWORK' && <Wifi className="w-6 h-6" />}
              {type === 'THREATS' && <Shield className="w-6 h-6" />}
              {type === 'INSIGHTS' && <Activity className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-2xl font-light tracking-[0.2em] text-cyan-200">
                {type === 'SCAN' && 'STORAGE ANALYZER'}
                {type === 'NETWORK' && 'NETWORK GUARDIAN'}
                {type === 'THREATS' && 'PROCESS & THREAT AUDIT'}
                {type === 'INSIGHTS' && 'SYSTEM TELEMETRY'}
              </h2>
              <p className="text-xs tracking-widest text-cyan-600 mt-1">SENTINEL ACTIVE INTELLIGENCE SUBSYSTEM</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-cyan-800/60 flex items-center justify-center text-cyan-500 hover:text-cyan-200 hover:border-cyan-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-sm text-cyan-300">
          
          {/* --- 1. SCAN MODAL --- */}
          {type === 'SCAN' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#02070E] border border-cyan-900/50 p-4 rounded-xl">
                  <div className="text-xs text-cyan-700 tracking-wider">RECOVERABLE TEMP</div>
                  <div className="text-2xl font-light text-cyan-200 mt-1">{(storageData.tempFilesMB / 1024).toFixed(2)} GB</div>
                  <div className="text-[10px] text-cyan-600 mt-1">Safe to delete immediately</div>
                </div>
                <div className="bg-[#02070E] border border-cyan-900/50 p-4 rounded-xl">
                  <div className="text-xs text-cyan-700 tracking-wider">SYSTEM CACHE</div>
                  <div className="text-2xl font-light text-cyan-200 mt-1">{(storageData.cacheMB / 1024).toFixed(2)} GB</div>
                  <div className="text-[10px] text-cyan-600 mt-1">Browser & shader caches</div>
                </div>
                <div className="bg-[#02070E] border border-cyan-900/50 p-4 rounded-xl">
                  <div className="text-xs text-cyan-700 tracking-wider">DRIVE FREE SPACE</div>
                  <div className="text-2xl font-light text-cyan-200 mt-1">{storageData.freeSpaceGB} GB / {storageData.totalSpaceGB} GB</div>
                  <div className="text-[10px] text-emerald-400 mt-1">Health: Good</div>
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-widest text-cyan-500 mb-3 font-semibold">Large & Orphaned Files Detected</h3>
                <div className="space-y-2">
                  {storageData.largeFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[#02070E] border border-cyan-950">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`w-4 h-4 ${file.risk === 'safe' ? 'text-cyan-500' : 'text-amber-500'}`} />
                        <div>
                          <div className="text-cyan-200 font-mono text-xs">{file.name}</div>
                          <div className="text-[10px] text-cyan-700 font-mono">{file.path}</div>
                        </div>
                      </div>
                      <div className="text-xs font-mono text-cyan-400">{(file.sizeMB / 1024).toFixed(2)} GB</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-cyan-950">
                <div className="text-xs text-cyan-600">
                  {cleaned ? 'Files deleted successfully. Freed ~4.82 GB.' : 'AI recommendation: Purging temporary files improves overall OS performance.'}
                </div>
                <button
                  disabled={cleaning || cleaned}
                  onClick={handleClean}
                  className="px-6 py-2.5 rounded-full bg-cyan-600/20 border border-cyan-500 text-cyan-200 hover:bg-cyan-500/30 flex items-center gap-2 text-xs tracking-wider transition-all disabled:opacity-50"
                >
                  {cleaning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {cleaned ? 'CLEANED' : cleaning ? 'PURGING...' : 'FREE UP 4.82 GB'}
                </button>
              </div>
            </div>
          )}

          {/* --- 2. NETWORK MODAL --- */}
          {type === 'NETWORK' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#02070E] border border-cyan-900/50 p-4 rounded-xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-cyan-700 tracking-wider">WI-FI PROTOCOL</div>
                    <div className="text-base text-cyan-200 mt-0.5">{networkData.ssid} ({networkData.encryption})</div>
                    <div className="text-[10px] text-emerald-400">Encrypted & Secure</div>
                  </div>
                </div>

                <div className="bg-[#02070E] border border-cyan-900/50 p-4 rounded-xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-cyan-700 tracking-wider">FIREWALL PROTECTION</div>
                    <div className="text-base text-cyan-200 mt-0.5">{networkData.firewallActive ? 'ACTIVE (BLOCKING INTRUSIONS)' : 'DISABLED'}</div>
                    <div className="text-[10px] text-cyan-500">{networkData.threatsBlockedToday} probes blocked today</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#02070E] border border-cyan-900/40 p-4 rounded-xl space-y-3">
                <div className="text-xs uppercase tracking-widest text-cyan-500 font-semibold">Active Port Monitor</div>
                <div className="flex gap-2">
                  {networkData.openPorts.map((port) => (
                    <span key={port} className="px-3 py-1 rounded bg-cyan-950/70 border border-cyan-800/60 font-mono text-xs text-cyan-300">
                      Port {port} (Authorized)
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-cyan-700 mt-2">
                  Public Gateway: <span className="font-mono text-cyan-400">{networkData.publicIp}</span> • DNS Leakage: <span className="text-emerald-400">None detected</span>
                </p>
              </div>
            </div>
          )}

          {/* --- 3. THREATS MODAL --- */}
          {type === 'THREATS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-widest text-cyan-500 font-semibold">Active Process Inspector</h3>
                <span className="text-xs text-emerald-400 font-mono">0 Critical Malware Threats</span>
              </div>
              <div className="divide-y divide-cyan-950/80 border border-cyan-900/40 rounded-xl overflow-hidden bg-[#02070E]">
                {threatsData.map((proc) => (
                  <div key={proc.pid} className="p-3.5 flex items-center justify-between hover:bg-cyan-950/20 transition-colors">
                    <div>
                      <div className="text-cyan-200 font-mono text-xs flex items-center gap-2">
                        {proc.name}
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border ${
                          proc.status === 'verified' 
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300' 
                            : proc.status === 'suspicious' 
                            ? 'bg-amber-950 border-amber-500 text-amber-300' 
                            : 'bg-cyan-950 border-cyan-700 text-cyan-400'
                        }`}>
                          {proc.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-cyan-700 font-mono mt-0.5">PID: {proc.pid} • {proc.path}</div>
                    </div>
                    <div className="text-right font-mono text-xs text-cyan-400">
                      <div>CPU: {proc.cpu}%</div>
                      <div className="text-[10px] text-cyan-600">{proc.memoryMB} MB RAM</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- 4. INSIGHTS MODAL --- */}
          {type === 'INSIGHTS' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#02070E] border border-cyan-900/50 p-4 rounded-xl text-center">
                  <div className="text-xs text-cyan-700">CPU LOAD</div>
                  <div className="text-3xl font-light text-cyan-300 mt-1">{systemData.cpuUsage}%</div>
                  <div className="text-[10px] text-cyan-600 mt-1">{systemData.cpuTemp}°C Normal</div>
                </div>
                <div className="bg-[#02070E] border border-cyan-900/50 p-4 rounded-xl text-center">
                  <div className="text-xs text-cyan-700">RAM USAGE</div>
                  <div className="text-3xl font-light text-cyan-300 mt-1">{systemData.ramUsed} GB</div>
                  <div className="text-[10px] text-cyan-600 mt-1">of {systemData.ramTotal} GB</div>
                </div>
                <div className="bg-[#02070E] border border-cyan-900/50 p-4 rounded-xl text-center">
                  <div className="text-xs text-cyan-700">GPU TELEMETRY</div>
                  <div className="text-3xl font-light text-cyan-300 mt-1">{systemData.gpuUsage}%</div>
                  <div className="text-[10px] text-cyan-600 mt-1">{systemData.gpuTemp}°C</div>
                </div>
                <div className="bg-[#02070E] border border-cyan-900/50 p-4 rounded-xl text-center">
                  <div className="text-xs text-cyan-700">BATTERY</div>
                  <div className="text-3xl font-light text-cyan-300 mt-1">{systemData.batteryLevel}%</div>
                  <div className="text-[10px] text-emerald-400 mt-1">{systemData.isCharging ? 'Plugged In' : 'Discharging'}</div>
                </div>
              </div>

              <div className="bg-[#02070E] border border-cyan-900/40 p-4 rounded-xl">
                <div className="text-xs uppercase tracking-widest text-cyan-500 font-semibold mb-2">AI Performance Assessment</div>
                <p className="text-xs text-cyan-300/80 leading-relaxed">
                  System thermal levels are well within operating parameters (CPU 48°C / GPU 52°C). Memory overhead is stable with 6.6 GB headroom. No thermal throttling or memory paging spikes detected.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
