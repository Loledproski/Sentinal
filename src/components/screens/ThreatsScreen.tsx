import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  AlertTriangle,
  Cpu,
  Terminal,
  Ban,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { SecurityProcess } from '../../types';

interface ThreatsScreenProps {
  threatsData: SecurityProcess[];
  onQuarantineProcess: (pid: number) => void;
  onTrustProcess: (pid: number) => void;
}

export const ThreatsScreen: React.FC<ThreatsScreenProps> = ({
  threatsData,
  onQuarantineProcess,
  onTrustProcess
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'suspicious' | 'verified' | 'system' | 'quarantined'>('all');
  const [selectedPid, setSelectedPid] = useState<number>(() => {
    const suspicious = threatsData.find((p) => p.status === 'suspicious');
    return suspicious ? suspicious.pid : threatsData[0]?.pid ?? 0;
  });
  const [sweeping, setSweeping] = useState(false);
  const [sweepNotice, setSweepNotice] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      total: threatsData.length,
      verified: threatsData.filter((p) => p.status === 'verified').length,
      suspicious: threatsData.filter((p) => p.status === 'suspicious').length,
      system: threatsData.filter((p) => p.status === 'system').length,
      quarantined: threatsData.filter((p) => p.status === 'quarantined').length
    };
  }, [threatsData]);

  const filteredProcesses = useMemo(() => {
    return threatsData.filter((proc) => {
      const matchesFilter = statusFilter === 'all' || proc.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        proc.name.toLowerCase().includes(q) ||
        proc.path.toLowerCase().includes(q) ||
        String(proc.pid).includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [threatsData, statusFilter, searchQuery]);

  const selectedProcess = useMemo(
    () => threatsData.find((p) => p.pid === selectedPid) || threatsData[0] || null,
    [threatsData, selectedPid]
  );

  const topConsumers = useMemo(() => {
    return [...threatsData]
      .filter((p) => p.status !== 'quarantined')
      .sort((a, b) => b.memoryMB - a.memoryMB)
      .slice(0, 3);
  }, [threatsData]);

  const totalMemMB = useMemo(
    () => threatsData.reduce((sum, p) => sum + (p.status === 'quarantined' ? 0 : p.memoryMB), 0),
    [threatsData]
  );

  const handleSweep = () => {
    setSweeping(true);
    setTimeout(() => {
      setSweeping(false);
      setSweepNotice(
        counts.suspicious > 0
          ? `Heuristic sweep finished: ${counts.suspicious} unverified background binary flagged for review.`
          : 'Heuristic sweep finished: Zero active threats or unsigned anomalies detected.'
      );
    }, 900);
  };

  const statusMeta = (status: SecurityProcess['status']) => {
    switch (status) {
      case 'verified':
        return { label: 'Verified', color: 'text-[#19C986]', icon: ShieldCheck };
      case 'suspicious':
        return { label: 'Suspicious', color: 'text-[#F59E0B]', icon: AlertTriangle };
      case 'quarantined':
        return { label: 'Quarantined', color: 'text-[#F87171]', icon: Ban };
      default:
        return { label: 'System', color: 'text-[#38BDF8]', icon: Terminal };
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1217] text-[#E6EDF3]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#202630] bg-[#13171F] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2A1D13] border border-[#56381D] flex items-center justify-center text-[#F59E0B]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-white leading-tight">
              Process & Threat Audit
            </h2>
            <p className="text-xs text-[#8591A3]">
              Real-Time Heuristic & Code-Signature Inspector
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs utility-mono">
          <span className={counts.suspicious > 0 ? 'text-[#F59E0B]' : 'text-[#19C986]'}>
            {counts.suspicious > 0
              ? `${counts.suspicious} Item Needs Review`
              : '0 Active Threats'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto utility-scroll p-6">
        <div className="max-w-[1260px] mx-auto space-y-5">
          {/* Top CleanC-Style Summary Header Card */}
          <div className="bg-[#161B23] border border-[#252C38] rounded-2xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center mb-4">
              <div>
                <div className="text-[11px] font-medium text-[#8591A3] mb-1">Active Processes</div>
                <div className="text-xl font-bold text-white utility-mono">{counts.total}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#8591A3] mb-1">Verified & System</div>
                <div className="text-xl font-bold text-[#19C986] utility-mono">
                  {counts.verified + counts.system}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#8591A3] mb-1">Suspicious</div>
                <div
                  className={`text-xl font-bold utility-mono ${
                    counts.suspicious > 0 ? 'text-[#F59E0B]' : 'text-[#8591A3]'
                  }`}
                >
                  {counts.suspicious}
                </div>
              </div>
              <div
                className={`rounded-xl px-4 py-2.5 border ${
                  counts.suspicious > 0
                    ? 'bg-[#261D12] border-[#593F1E]'
                    : 'bg-[#0F2620] border-[#1C4D3E]'
                }`}
              >
                <div className="text-[11px] font-medium text-[#A4B0C0] mb-0.5">Threat Posture</div>
                <div
                  className={`text-base font-bold ${
                    counts.suspicious > 0 ? 'text-[#F59E0B]' : 'text-[#19C986]'
                  }`}
                >
                  {counts.suspicious > 0 ? 'Action Recommended' : 'All Clear'}
                </div>
              </div>
            </div>

            {/* Multi-Segment Distribution Bar (Cores/CleanC blend) */}
            <div className="w-full h-2 rounded-full bg-[#242B37] overflow-hidden flex gap-0.5">
              <div
                className="h-full bg-[#19C986] transition-all duration-500"
                style={{ width: `${((counts.verified + counts.system) / Math.max(1, counts.total)) * 100}%` }}
              />
              {counts.suspicious > 0 && (
                <div
                  className="h-full bg-[#F59E0B] transition-all duration-500"
                  style={{ width: `${(counts.suspicious / Math.max(1, counts.total)) * 100}%` }}
                />
              )}
              {counts.quarantined > 0 && (
                <div
                  className="h-full bg-[#F87171] transition-all duration-500"
                  style={{ width: `${(counts.quarantined / Math.max(1, counts.total)) * 100}%` }}
                />
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-[#8591A3] utility-mono mt-2">
              <span>Footprint: {(totalMemMB / 1024).toFixed(2)} GB allocated across active processes</span>
              <span>{counts.quarantined} isolated in vault</span>
            </div>
          </div>

          {/* Main 2-Column Split (8 cols Left / 4 cols Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT: Searchable & Filterable Process Inspector */}
            <div className="lg:col-span-8 bg-[#161B23] border border-[#252C38] rounded-2xl p-5 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-[#7A8699] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by name, path, or PID..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#10141B] border border-[#252D3A] text-xs text-white placeholder-[#6D798C] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-[#10141B] border border-[#242C3A] p-1 rounded-lg overflow-x-auto">
                  {(['all', 'suspicious', 'verified', 'system', 'quarantined'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusFilter(tab)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize whitespace-nowrap transition-colors cursor-pointer ${
                        statusFilter === tab
                          ? 'bg-[#252E3D] text-white'
                          : 'text-[#8591A3] hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-[#242C3A] rounded-xl overflow-hidden bg-[#10141B]">
                <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-medium text-[#7A8699] border-b border-[#202734] bg-[#131822]">
                  <div className="col-span-5">Process & Binary Path</div>
                  <div className="col-span-2">CPU</div>
                  <div className="col-span-2 text-right">Memory</div>
                  <div className="col-span-3 text-right">Signature</div>
                </div>

                {filteredProcesses.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#8591A3]">
                    No processes match the current filter.
                  </div>
                ) : (
                  <div className="divide-y divide-[#1D232E]">
                    {filteredProcesses.map((proc) => {
                      const meta = statusMeta(proc.status);
                      const StatusIcon = meta.icon;
                      const isSelected = selectedProcess?.pid === proc.pid;
                      return (
                        <button
                          key={proc.pid}
                          type="button"
                          onClick={() => setSelectedPid(proc.pid)}
                          className={`w-full text-left grid grid-cols-12 items-center px-4 py-3.5 text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#1C2432]'
                              : 'hover:bg-[#161C27]'
                          }`}
                        >
                          <div className="col-span-5 min-w-0 pr-3">
                            <div className="font-semibold text-white truncate flex items-center gap-2">
                              <span className="truncate">{proc.name}</span>
                            </div>
                            <div className="text-[11px] utility-mono text-[#7A8699] truncate mt-0.5">
                              PID {proc.pid} · {proc.path}
                            </div>
                          </div>

                          <div className="col-span-2 pr-3">
                            <div className="utility-mono text-[#CBD5E1] mb-1">
                              {proc.status === 'quarantined' ? '0.0%' : `${proc.cpu.toFixed(1)}%`}
                            </div>
                            <div className="h-1.5 bg-[#252D3D] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#38BDF8] rounded-full"
                                style={{
                                  width:
                                    proc.status === 'quarantined'
                                      ? '0%'
                                      : `${Math.min(100, Math.max(4, proc.cpu * 5))}%`
                                }}
                              />
                            </div>
                          </div>

                          <div className="col-span-2 text-right utility-mono text-[#E2E8F0]">
                            {proc.status === 'quarantined' ? '0 MB' : `${proc.memoryMB} MB`}
                          </div>

                          <div className={`col-span-3 flex items-center justify-end gap-1.5 font-medium ${meta.color}`}>
                            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{meta.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Sweep CTA + Selected Process Forensics + Top Consumers */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              <button
                type="button"
                disabled={sweeping}
                onClick={handleSweep}
                className="w-full py-3.5 px-5 rounded-xl bg-[#17C983] hover:bg-[#20DA91] text-[#051B12] font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
              >
                {sweeping ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                <span>{sweeping ? 'Running Heuristic Sweep...' : 'Run Threat Sweep'}</span>
              </button>

              {sweepNotice && (
                <div className="bg-[#122520] border border-[#1E4F40] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#A7F3D0]">
                  <CheckCircle2 className="w-4 h-4 text-[#19C986] shrink-0 mt-0.5" />
                  <span>{sweepNotice}</span>
                </div>
              )}

              {/* Selected Process Forensics Card */}
              {selectedProcess && (
                <div className="bg-[#161B23] border border-[#252C38] rounded-2xl p-4 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-[#8591A3]">Selected Binary</div>
                      <h3 className="text-sm font-bold text-white truncate mt-0.5">
                        {selectedProcess.name}
                      </h3>
                    </div>
                    <span className="text-[11px] utility-mono text-[#8591A3] shrink-0">
                      PID {selectedProcess.pid}
                    </span>
                  </div>

                  <div className="text-[11px] utility-mono text-[#94A3B8] bg-[#10141B] border border-[#222936] rounded-lg px-3 py-2 break-all">
                    {selectedProcess.path}
                  </div>

                  {/* Behavioral Bars */}
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#CBD5E1]">CPU Load</span>
                        <span className="utility-mono text-[#38BDF8]">{selectedProcess.cpu}%</span>
                      </div>
                      <div className="h-1.5 bg-[#252D3D] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#38BDF8] rounded-full"
                          style={{ width: `${Math.min(100, Math.max(4, selectedProcess.cpu * 5))}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#CBD5E1]">Memory Allocation</span>
                        <span className="utility-mono text-[#F59E0B]">{selectedProcess.memoryMB} MB</span>
                      </div>
                      <div className="h-1.5 bg-[#252D3D] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F59E0B] rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(4, (selectedProcess.memoryMB / 4096) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Controls */}
                  {selectedProcess.status === 'suspicious' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onQuarantineProcess(selectedProcess.pid)}
                        className="py-2 px-3 rounded-lg bg-[#2C181C] hover:bg-[#3B2026] border border-[#5D2A34] text-[#F87171] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Quarantine
                      </button>
                      <button
                        type="button"
                        onClick={() => onTrustProcess(selectedProcess.pid)}
                        className="py-2 px-3 rounded-lg bg-[#112A22] hover:bg-[#173A2F] border border-[#1E5342] text-[#19C986] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Mark Trusted
                      </button>
                    </div>
                  )}

                  {selectedProcess.status === 'quarantined' && (
                    <button
                      type="button"
                      onClick={() => onTrustProcess(selectedProcess.pid)}
                      className="w-full py-2 px-3 rounded-lg bg-[#1C2330] hover:bg-[#252E3E] border border-[#313D52] text-[#E2E8F0] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore & Mark Verified
                    </button>
                  )}

                  {(selectedProcess.status === 'verified' || selectedProcess.status === 'system') && (
                    <div className="text-xs text-[#19C986] flex items-center gap-2 pt-1">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Signed publisher certificate verified.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Top Resource Consumers (CleanC Ranking Style) */}
              <div className="bg-[#161B23] border border-[#252C38] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Top Memory Consumers</h3>
                  <Cpu className="w-3.5 h-3.5 text-[#7A8699]" />
                </div>
                <div className="space-y-2">
                  {topConsumers.map((proc, index) => {
                    const badgeStyle =
                      index === 0
                        ? 'bg-[#F5B731] text-[#1A1303]'
                        : index === 1
                        ? 'bg-[#9AA3B2] text-[#111419]'
                        : 'bg-[#D97736] text-[#1C0D03]';
                    return (
                      <button
                        key={proc.pid}
                        type="button"
                        onClick={() => setSelectedPid(proc.pid)}
                        className="w-full flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-[#1D2430] transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-md text-xs font-bold utility-mono flex items-center justify-center shrink-0 ${badgeStyle}`}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{proc.name}</div>
                            <div className="text-[10px] utility-mono text-[#7A8699]">
                              CPU {proc.cpu}% · PID {proc.pid}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-bold utility-mono text-[#F59E0B] shrink-0">
                          {proc.memoryMB} MB
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
