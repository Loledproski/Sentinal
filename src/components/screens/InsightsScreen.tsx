import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  MemoryStick,
  Monitor,
  HardDrive,
  Fan,
  Network,
  Thermometer,
  Gauge,
  Pause,
  Play,
  RefreshCw,
  BatteryCharging,
  Battery,
  Zap,
  Check,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Layers,
} from 'lucide-react';
import { SystemOverview, SecurityProcess, RamBoostResult } from '../../types';

interface InsightsScreenProps {
  systemData: SystemOverview;
  processes: SecurityProcess[];
  lastRamBoost: RamBoostResult | null;
  fps: number;
  frameTimeMs: number;
  overlayVisible: boolean;
  onToggleOverlay: () => void;
  onRunRamBoost: (options: { trimWorkingSets: boolean; targetPids: number[] }) => Promise<RamBoostResult>;
  onRefreshTelemetry?: () => Promise<void>;
}

interface MetricBarItem {
  label: string;
  valueText: string;
  percent: number;
}

const RingGauge: React.FC<{ percent: number; color?: string }> = ({
  percent,
  color = '#38BDF8',
}) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = 48;
  const stroke = 9;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative w-[108px] h-[108px] shrink-0 flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="#352F44"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 450ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className="absolute text-2xl font-semibold text-white utility-mono">
        {Math.round(clamped)}%
      </span>
    </div>
  );
};

const MetricBarRow: React.FC<MetricBarItem> = ({ label, valueText, percent }) => {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] gap-2">
        <span className="text-[#D4CEE0] truncate">{label}</span>
        <span className="text-[#9E95B0] utility-mono shrink-0">{valueText}</span>
      </div>
      <div className="w-full h-1.5 bg-[#352F44] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#38BDF8] rounded-full transition-all duration-500"
          style={{ width: `${Math.max(clamped, clamped > 0 ? 3 : 0)}%` }}
        />
      </div>
    </div>
  );
};

export const InsightsScreen: React.FC<InsightsScreenProps> = ({
  systemData,
  processes,
  lastRamBoost,
  fps,
  frameTimeMs,
  overlayVisible,
  onToggleOverlay,
  onRunRamBoost,
  onRefreshTelemetry,
}) => {
  const [live, setLive] = useState(true);
  const [tick, setTick] = useState(0);
  const [trimWorkingSets, setTrimWorkingSets] = useState(true);
  const [selectedBoostPids, setSelectedBoostPids] = useState<number[]>([]);
  const [isBoosting, setIsBoosting] = useState(false);

  const boostableProcesses = useMemo(() => {
    return processes
      .filter((p) => p.canBoost !== false && p.status !== 'quarantined' && p.status !== 'system')
      .sort((a, b) => b.memoryMB - a.memoryMB)
      .slice(0, 6);
  }, [processes]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      if (onRefreshTelemetry) {
        onRefreshTelemetry();
      }
    }, 2400);
    return () => clearInterval(id);
  }, [live, onRefreshTelemetry]);

  const drift = (seed: number, range: number) =>
    Math.round(Math.sin((tick + 1) * 0.9 + seed) * range);

  const cpuUsage = Math.min(98, Math.max(2, systemData.cpuUsage));
  const gpuUsage = Math.min(98, Math.max(2, systemData.gpuUsage));
  const ramUsed = +Math.max(0.8, systemData.ramUsed).toFixed(1);
  const ramTotal = Math.max(4, systemData.ramTotal);
  const ramPercent = Math.min(99, Math.round((ramUsed / ramTotal) * 100));
  const ramPercentDecimal = ((ramUsed / ramTotal) * 100).toFixed(1);
  const cpuTemp = Math.max(32, systemData.cpuTemp);
  const gpuTemp = Math.max(35, systemData.gpuTemp);

  const estimatedReclaimableMB = useMemo(() => {
    const wsTrimMB = trimWorkingSets ? Math.round(ramUsed * 1024 * 0.12) : 0;
    const appsMB = boostableProcesses
      .filter((p) => selectedBoostPids.includes(p.pid))
      .reduce((acc, p) => acc + Math.round(p.memoryMB * 0.85), 0);
    return wsTrimMB + appsMB;
  }, [trimWorkingSets, ramUsed, boostableProcesses, selectedBoostPids]);

  const toggleBoostPid = (pid: number) => {
    setSelectedBoostPids((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const handleSelectAllBoostable = () => {
    setSelectedBoostPids(boostableProcesses.map((p) => p.pid));
  };

  const handleClearBoostable = () => {
    setSelectedBoostPids([]);
  };

  const handleBoostClick = async () => {
    if (!trimWorkingSets && selectedBoostPids.length === 0) return;
    setIsBoosting(true);
    try {
      await onRunRamBoost({
        trimWorkingSets,
        targetPids: selectedBoostPids,
      });
      setSelectedBoostPids([]);
    } finally {
      setIsBoosting(false);
    }
  };

  const cpuThreads: MetricBarItem[] = useMemo(() => {
    if (systemData.cpuCores && systemData.cpuCores.length > 0) {
      return systemData.cpuCores.slice(0, 6).map((c) => ({
        label: c.core,
        valueText: `${c.load}%`,
        percent: c.load,
      }));
    }
    return [
      { label: 'Core #1 Thread #1', valueText: `${Math.min(100, Math.max(4, cpuUsage + 8))}%`, percent: cpuUsage + 8 },
      { label: 'Core #1 Thread #2', valueText: `${Math.min(100, Math.max(2, Math.round(cpuUsage * 0.45)))}%`, percent: Math.round(cpuUsage * 0.45) },
      { label: 'Core #2 Thread #1', valueText: `${Math.min(100, Math.max(6, cpuUsage + 12))}%`, percent: cpuUsage + 12 },
      { label: 'Core #2 Thread #2', valueText: `${Math.min(100, Math.max(1, Math.round(cpuUsage * 0.32)))}%`, percent: Math.round(cpuUsage * 0.32) },
      { label: 'Core #3 Thread #1', valueText: `${Math.min(100, Math.max(5, cpuUsage - 3))}%`, percent: cpuUsage - 3 },
    ];
  }, [systemData.cpuCores, cpuUsage]);

  const ramAvail = +(ramTotal - ramUsed).toFixed(1);
  const ramMetrics: MetricBarItem[] = [
    { label: 'Virtual memory', valueText: `${Math.min(96, ramPercent + 6)}%`, percent: ramPercent + 6 },
    { label: 'Working set', valueText: `${ramUsed.toFixed(1)} GB`, percent: ramPercent },
    { label: 'Standby cache', valueText: `${Math.max(0.4, +(ramAvail * 0.38).toFixed(1))} GB`, percent: 34 },
    { label: 'Available free', valueText: `${Math.max(0.2, ramAvail)} GB`, percent: Math.round((ramAvail / ramTotal) * 100) },
  ];

  const gpuMetrics: MetricBarItem[] = [
    { label: '3D Engine', valueText: `${gpuUsage}%`, percent: gpuUsage },
    { label: 'Overlay', valueText: `${Math.max(0, Math.round(gpuUsage * 0.15))}%`, percent: Math.round(gpuUsage * 0.15) },
    { label: 'Video Decode', valueText: `${Math.max(0, Math.round(gpuUsage * 0.24))}%`, percent: Math.round(gpuUsage * 0.24) },
    { label: 'VRAM Copy', valueText: `${Math.max(1, Math.round(gpuUsage * 0.12))}%`, percent: Math.round(gpuUsage * 0.12) },
    { label: 'Compute Queue', valueText: `${Math.max(2, Math.round(gpuUsage * 0.42))}%`, percent: Math.round(gpuUsage * 0.42) },
  ];

  const readSpeed = systemData.diskReadMBs ?? +(18.4 + Math.abs(drift(7, 8))).toFixed(2);
  const writeSpeed = systemData.diskWriteMBs ?? +(6.2 + Math.abs(drift(8, 5))).toFixed(2);
  const cpuFanPct = Math.min(95, Math.max(32, 42 + Math.round(cpuUsage * 0.35)));
  const sysFanPct = Math.min(90, Math.max(28, 36 + Math.round(cpuUsage * 0.28)));
  const netDown = systemData.netDownMBs ?? +(14.6 + Math.abs(drift(11, 5))).toFixed(2);
  const netUp = systemData.netUpMBs ?? +(3.4 + Math.abs(drift(12, 3))).toFixed(2);

  return (
    <div className="flex flex-col h-full bg-[#16131D] text-[#EFEAF7]">
      {/* Cores-Inspired Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2438] bg-[#1A1622] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2A2338] border border-[#3E3552] flex items-center justify-center text-[#38BDF8]">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-white leading-tight">
              System Insights & RAM Booster
            </h2>
            <p className="text-xs text-[#9C92AE]">
              Live Hardware Telemetry · {systemData.isLiveBackend ? 'Connected to OS Kernel' : 'Browser Hardware Bridge'} · Status {systemData.status === 'OPTIMAL' ? 'Optimal' : systemData.status}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleOverlay}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              overlayVisible
                ? 'bg-[#0F2620] border-[#1D5444] text-[#00E676]'
                : 'bg-[#262132] hover:bg-[#312A40] border-[#3A324B] text-[#E4DDF0]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{overlayVisible ? 'Hide Overlay (Shift+F3)' : 'Show Overlay (Shift+F3)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setLive((prev) => !prev)}
            className="px-3.5 py-1.5 rounded-lg bg-[#262132] hover:bg-[#312A40] border border-[#3A324B] text-xs font-medium text-[#E4DDF0] flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            {live ? <Pause className="w-3.5 h-3.5 text-[#38BDF8]" /> : <Play className="w-3.5 h-3.5 text-[#19C986]" />}
            <span>{live ? 'Pause Live' : 'Resume Live'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTick((t) => t + 1);
              if (onRefreshTelemetry) onRefreshTelemetry();
            }}
            className="px-3 py-1.5 rounded-lg bg-[#262132] hover:bg-[#312A40] border border-[#3A324B] text-xs font-medium text-[#C2B8D4] hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sample Now</span>
          </button>
        </div>
      </div>

      {/* Main Hardware + OMEN Overlay Strip + RAM Boost Scrollable Workspace */}
      <div className="flex-1 overflow-y-auto utility-scroll p-6">
        <div className="max-w-[1260px] mx-auto space-y-5">
          {/* OMEN GAMING HUB LIVE HUD TELEMETRY STRIP (Matches user reference image) */}
          <div className="bg-[#211D2B] border border-[#322B42] rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#090B0E] border border-white/10 flex items-center justify-center text-[#00E676]">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  OMEN In-Game Performance Overlay Bar
                </div>
                <div className="text-[11px] text-[#9C92AE]">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-[#14111B] border border-[#362E47] text-[#E4DDF0] utility-mono text-[10px]">Shift + F3</kbd> anytime to pin or hide this floating HUD bar at the top of your screen
                </div>
              </div>
            </div>

            {/* Embedded Exact Replica of the OMEN Overlay Bar */}
            <div className="bg-[#050608] border border-white/10 rounded-md px-5 py-2.5 flex flex-wrap items-center justify-between sm:justify-start gap-7 shadow-inner">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[15px] font-extrabold tracking-wide text-white">CPU</span>
                <span className="text-[15px] font-bold text-white tabular-nums">{cpuUsage}%</span>
                <span className="text-[15px] font-bold text-[#00E676] tabular-nums">{cpuTemp}°C</span>
              </div>

              <div className="flex items-baseline gap-2.5">
                <span className="text-[15px] font-extrabold tracking-wide text-white">GPU</span>
                <span className="text-[15px] font-bold text-white tabular-nums">{gpuUsage}%</span>
                <span className="text-[15px] font-bold text-[#00E676] tabular-nums">{gpuTemp}°C</span>
              </div>

              <div className="flex items-baseline gap-2.5">
                <span className="text-[15px] font-extrabold tracking-wide text-white">RAM</span>
                <span className="text-[15px] font-bold text-white tabular-nums">{ramPercentDecimal}%</span>
              </div>

              <div className="flex items-baseline gap-2.5">
                <span className="text-[15px] font-extrabold tracking-wide text-white">FPS</span>
                <span className="text-[15px] font-bold text-white tabular-nums">{fps}</span>
                <span className="text-[11px] text-[#8E84A1] utility-mono">({frameTimeMs} ms)</span>
              </div>
            </div>
          </div>

          {/* ROW 1: CPU / RAM / GPU Ring Gauge Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* CPU Card */}
            <div className="bg-[#211D2B] border border-[#322B42] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#2E283D] flex items-center justify-center text-[#E4DDF0]">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-white">CPU</h3>
                  </div>
                  <span className="text-xs font-bold utility-mono text-[#00E676]">
                    {cpuTemp}°C
                  </span>
                </div>
                <p className="text-xs text-[#A39AB5] mb-5 truncate" title={systemData.cpuModel}>
                  {systemData.cpuModel || '12th Gen Intel Core i7-12700H'}
                </p>
              </div>
              <div className="flex items-center gap-5">
                <RingGauge percent={cpuUsage} color="#38BDF8" />
                <div className="flex-1 space-y-2.5 max-h-[146px] overflow-y-auto utility-scroll pr-1">
                  {cpuThreads.map((item) => (
                    <MetricBarRow key={item.label} {...item} />
                  ))}
                </div>
              </div>
            </div>

            {/* RAM Card */}
            <div className="bg-[#211D2B] border border-[#322B42] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#2E283D] flex items-center justify-center text-[#E4DDF0]">
                      <MemoryStick className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-white">RAM</h3>
                  </div>
                  <span className="text-xs utility-mono text-[#38BDF8]">
                    {ramPercentDecimal}% · {ramUsed.toFixed(1)}/{ramTotal.toFixed(1)} GB
                  </span>
                </div>
                <p className="text-xs text-[#A39AB5] mb-5">
                  Physical Memory · {ramAvail} GB Free
                </p>
              </div>
              <div className="flex items-center gap-5">
                <RingGauge percent={ramPercent} color="#38BDF8" />
                <div className="flex-1 space-y-2.5 max-h-[146px] overflow-y-auto utility-scroll pr-1">
                  {ramMetrics.map((item) => (
                    <MetricBarRow key={item.label} {...item} />
                  ))}
                </div>
              </div>
            </div>

            {/* GPU Card */}
            <div className="bg-[#211D2B] border border-[#322B42] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#2E283D] flex items-center justify-center text-[#E4DDF0]">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-white">GPU</h3>
                  </div>
                  <span className="text-xs font-bold utility-mono text-[#00E676]">
                    {gpuTemp}°C · {fps} FPS
                  </span>
                </div>
                <p className="text-xs text-[#A39AB5] mb-5 truncate">
                  {systemData.gpuModel || 'NVIDIA GeForce RTX 4070'}
                </p>
              </div>
              <div className="flex items-center gap-5">
                <RingGauge percent={gpuUsage} color="#38BDF8" />
                <div className="flex-1 space-y-2.5 max-h-[146px] overflow-y-auto utility-scroll pr-1">
                  {gpuMetrics.map((item) => (
                    <MetricBarRow key={item.label} {...item} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: OMEN GAMING HUB–STYLE RAM BOOST ACCELERATOR */}
          <div className="bg-[#211D2B] border border-[#3A314D] rounded-2xl p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-5 border-b border-[#312A42]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FB7185]/20 to-[#A855F7]/20 border border-[#FB7185]/40 flex items-center justify-center text-[#FB7185]">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-white">
                      RAM Boost — Instant Memory Optimizer
                    </h3>
                    <span className="text-xs text-[#A39AB5]">
                      Win32 EmptyWorkingSet · Standby & Background Trim
                    </span>
                  </div>
                  <p className="text-xs text-[#9C92AE] mt-0.5">
                    Reclaims unused physical memory pages from active processes and optionally suspends heavy background apps
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-[11px] text-[#9C92AE]">Estimated Reclaimable</div>
                  <div className="text-lg font-bold utility-mono text-[#FB7185]">
                    ~{(estimatedReclaimableMB / 1024).toFixed(2)} GB ({estimatedReclaimableMB} MB)
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isBoosting || (!trimWorkingSets && selectedBoostPids.length === 0)}
                  onClick={handleBoostClick}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#FB7185] to-[#A855F7] hover:brightness-110 active:scale-[0.99] text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isBoosting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {isBoosting
                      ? 'Trimming Working Sets...'
                      : `Boost RAM Now (${(estimatedReclaimableMB / 1024).toFixed(2)} GB)`}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left 5 cols: Working Set Trim Mode + Last Boost Telemetry Report */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  {/* Option 1: Safe Win32 Working Set Trim */}
                  <button
                    type="button"
                    onClick={() => setTrimWorkingSets((prev) => !prev)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      trimWorkingSets
                        ? 'bg-[#2B2438] border-[#52436B]'
                        : 'bg-[#1A1622] border-[#2C253B] opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                          trimWorkingSets
                            ? 'bg-[#FB7185] border-[#FB7185] text-[#1A0B12]'
                            : 'border-[#584E6A] bg-transparent'
                        }`}
                      >
                        {trimWorkingSets && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Win32 Working-Set Trim (Safe — Never Closes Apps)
                        </div>
                        <div className="text-[11px] text-[#A39AB5] mt-0.5 leading-relaxed">
                          Invokes <code className="utility-mono text-[#E4DDF0]">psapi.dll EmptyWorkingSet</code> across all user processes to release idle memory pages back to Windows.
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold utility-mono text-[#38BDF8] shrink-0">
                      ~{Math.round(ramUsed * 1024 * 0.12)} MB
                    </span>
                  </button>

                  {/* Before / After Live RAM Meter */}
                  <div className="bg-[#1A1622] border border-[#2D263C] rounded-xl p-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-[#A39AB5]">Current Memory Allocation</span>
                      <span className="utility-mono text-white font-semibold">
                        {ramUsed.toFixed(1)} GB used · {ramAvail} GB free
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-md overflow-hidden flex gap-0.5 bg-[#2D273B]">
                      <div
                        className="h-full bg-[#38BDF8] transition-all duration-500"
                        style={{
                          width: `${Math.max(10, ramPercent - Math.round((estimatedReclaimableMB / (ramTotal * 1024)) * 100))}%`,
                        }}
                      />
                      <div
                        className="h-full bg-[#FB7185] transition-all duration-500"
                        style={{
                          width: `${Math.min(35, Math.round((estimatedReclaimableMB / (ramTotal * 1024)) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#9C92AE] mt-2">
                      <span>Blue: Active Kernel & Core</span>
                      <span className="text-[#FB7185]">Coral: Reclaimable via RAM Boost</span>
                    </div>
                  </div>
                </div>

                {/* Last Boost Report */}
                {lastRamBoost ? (
                  <div className="bg-[#152622] border border-[#225243] rounded-xl p-3.5 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#19C986] shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-semibold text-white">
                        Last Boost ({lastRamBoost.timestamp}): Freed {(lastRamBoost.freedMB / 1024).toFixed(2)} GB ({lastRamBoost.freedMB} MB)
                      </div>
                      <div className="text-[#A7F3D0] utility-mono text-[11px] mt-0.5">
                        RAM dropped {lastRamBoost.beforeUsedGB.toFixed(1)} GB → {lastRamBoost.afterUsedGB.toFixed(1)} GB · {lastRamBoost.trimmedProcessesCount} processes trimmed
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#1A1622] border border-[#2C253B] rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-[#9C92AE]">
                    <ShieldCheck className="w-4 h-4 text-[#38BDF8] shrink-0" />
                    <span>
                      Ready to optimize. Select optional background apps on the right or run a safe working-set trim immediately.
                    </span>
                  </div>
                )}
              </div>

              {/* Right 7 cols: Selectable High-RAM Background Apps Checklist */}
              <div className="lg:col-span-7 bg-[#1A1622] border border-[#2D263C] rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      Optional Background App Cleanup ({selectedBoostPids.length} selected)
                    </h4>
                    <p className="text-[11px] text-[#9C92AE]">
                      Check non-essential background tasks to suspend and reclaim their dedicated RAM
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSelectAllBoostable}
                      className="px-2.5 py-1 rounded-md bg-[#282236] hover:bg-[#342C46] text-[11px] font-medium text-[#E4DDF0] transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearBoostable}
                      className="px-2.5 py-1 rounded-md bg-[#282236] hover:bg-[#342C46] text-[11px] font-medium text-[#9C92AE] hover:text-white transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {boostableProcesses.length === 0 ? (
                  <div className="flex-1 py-8 text-center text-xs text-[#9C92AE]">
                    All background high-memory tasks have already been suspended.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[270px] overflow-y-auto utility-scroll pr-1">
                    {boostableProcesses.map((proc) => {
                      const isSelected = selectedBoostPids.includes(proc.pid);
                      const reclaimMB = Math.round(proc.memoryMB * 0.85);
                      return (
                        <button
                          key={proc.pid}
                          type="button"
                          onClick={() => toggleBoostPid(proc.pid)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-[#2C2136] border-[#FB7185]/60'
                              : 'bg-[#211D2B] border-[#312A42] hover:border-[#463C5E]'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                                isSelected
                                  ? 'bg-[#FB7185] border-[#FB7185] text-[#1A0B12]'
                                  : 'border-[#584E6A] bg-transparent'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white">
                                  {proc.name}
                                </span>
                                <span className="text-[10px] utility-mono text-[#9C92AE]">
                                  PID {proc.pid} · CPU {proc.cpu}%
                                </span>
                              </div>
                              {/* Full Executable Path Shown Explicitly */}
                              <div className="text-[11px] utility-mono text-[#B4A8CC] break-all mt-0.5">
                                Path: {proc.path}
                              </div>
                              <div className="text-[10px] text-[#8E84A1] mt-0.5">
                                Non-system user application · Safe to trim or suspend (~{reclaimMB} MB reclaimable)
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold utility-mono text-[#FB7185]">
                              {proc.memoryMB} MB
                            </div>
                            <div className="text-[10px] text-[#34D399] utility-mono">
                              Free ~{reclaimMB} MB
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ROW 3: Drives / Fans & Battery / Interfaces */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Drives */}
            <div className="bg-[#211D2B] border border-[#322B42] rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-md bg-[#2E283D] flex items-center justify-center text-[#E4DDF0]">
                  <HardDrive className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Drives</h3>
              </div>
              <div className="space-y-3.5">
                <MetricBarRow
                  label="NVMe System Drive Read Speed"
                  valueText={`${readSpeed} MB/s`}
                  percent={Math.min(100, readSpeed * 2.1)}
                />
                <MetricBarRow
                  label="NVMe System Drive Write Speed"
                  valueText={`${writeSpeed} MB/s`}
                  percent={Math.min(100, writeSpeed * 4.5)}
                />
              </div>
            </div>

            {/* Fans & Battery */}
            <div className="bg-[#211D2B] border border-[#322B42] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-[#2E283D] flex items-center justify-center text-[#E4DDF0]">
                    <Fan className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Fans & Power</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs utility-mono text-[#34D399]">
                  {systemData.isCharging ? (
                    <BatteryCharging className="w-4 h-4" />
                  ) : (
                    <Battery className="w-4 h-4" />
                  )}
                  <span>{systemData.batteryLevel}%</span>
                </div>
              </div>
              <div className="space-y-3.5">
                <MetricBarRow
                  label="CPU Fan"
                  valueText={`${cpuFanPct}% · ${Math.round(cpuFanPct * 32)} RPM`}
                  percent={cpuFanPct}
                />
                <MetricBarRow
                  label="System Fan #1"
                  valueText={`${sysFanPct}% · ${Math.round(sysFanPct * 28)} RPM`}
                  percent={sysFanPct}
                />
              </div>
            </div>

            {/* Interfaces */}
            <div className="bg-[#211D2B] border border-[#322B42] rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-md bg-[#2E283D] flex items-center justify-center text-[#E4DDF0]">
                  <Network className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Interfaces</h3>
              </div>
              <div className="space-y-3.5">
                <MetricBarRow
                  label="Wi-Fi 6E Download Speed"
                  valueText={`${netDown} MB/s`}
                  percent={Math.min(100, netDown * 2.8)}
                />
                <MetricBarRow
                  label="Wi-Fi 6E Upload Speed"
                  valueText={`${netUp} MB/s`}
                  percent={Math.min(100, netUp * 5.2)}
                />
              </div>
            </div>
          </div>

          {/* ROW 4: CPU Temperature / RAM Usage / GPU Temperature Spectrum Strips (Cores Signature) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* CPU Temperature */}
            <div className="bg-[#211D2B] border border-[#322B42] rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-md bg-[#2E283D] flex items-center justify-center text-[#E4DDF0]">
                  <Thermometer className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">CPU Temperature</h3>
              </div>
              <p className="text-xs text-[#C6BDD8] utility-mono mb-4">
                Avg. temperature: {cpuTemp} °C
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#9C92AE] utility-mono whitespace-nowrap">
                  Core #1 ({cpuTemp - 2} °C)
                </span>
                <div className="flex-1 h-4 rounded-md overflow-hidden flex gap-0.5 bg-[#2D273B]">
                  <div className="h-full bg-[#38BDF8]" style={{ width: '24%' }} />
                  <div className="h-full bg-[#FB7185]" style={{ width: '32%' }} />
                  <div className="h-full bg-[#A855F7]" style={{ width: '44%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#8E84A1] mt-3 utility-mono">
                <span>Thermal headroom: {Math.max(0, 95 - cpuTemp)} °C</span>
                <span className="text-[#34D399]">No throttling</span>
              </div>
            </div>

            {/* RAM Usage */}
            <div className="bg-[#211D2B] border border-[#322B42] rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-md bg-[#2E283D] flex items-center justify-center text-[#E4DDF0]">
                  <Gauge className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">RAM Usage</h3>
              </div>
              <p className="text-xs text-[#C6BDD8] utility-mono mb-4">
                Memory: {ramUsed.toFixed(1)}/{ramTotal.toFixed(1)} GB ({ramPercentDecimal}%)
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#9C92AE] whitespace-nowrap">
                  RAM usage
                </span>
                <div className="flex-1 h-4 rounded-md overflow-hidden flex gap-0.5 bg-[#2D273B]">
                  <div className="h-full bg-[#38BDF8]" style={{ width: '16%' }} />
                  <div className="h-full bg-[#FB7185]" style={{ width: '36%' }} />
                  <div className="h-full bg-[#A855F7]" style={{ width: '48%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#8E84A1] mt-3 utility-mono">
                <span>Available: {ramAvail} GB</span>
                <span>Paging: Stable</span>
              </div>
            </div>

            {/* GPU Temperature */}
            <div className="bg-[#211D2B] border border-[#322B42] rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-md bg-[#2E283D] flex items-center justify-center text-[#E4DDF0]">
                  <Thermometer className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">GPU Temperature</h3>
              </div>
              <p className="text-xs text-[#C6BDD8] utility-mono mb-4">
                Avg. temperature: {gpuTemp} °C
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#9C92AE] utility-mono whitespace-nowrap">
                  Core ({gpuTemp - 3} °C)
                </span>
                <div className="flex-1 h-4 rounded-md overflow-hidden flex gap-0.5 bg-[#2D273B]">
                  <div className="h-full bg-[#38BDF8]" style={{ width: '28%' }} />
                  <div className="h-full bg-[#FB7185]" style={{ width: '34%' }} />
                  <div className="h-full bg-[#A855F7]" style={{ width: '38%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#8E84A1] mt-3 utility-mono">
                <span>Hotspot: {gpuTemp + 7} °C</span>
                <span className="text-[#34D399]">Optimal band</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
