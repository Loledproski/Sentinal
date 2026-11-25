import React, { useState } from 'react';
import {
  Wifi,
  Shield,
  ShieldAlert,
  Globe,
  RefreshCw,
  CheckCircle2,
  Lock,
  Unlock,
  Activity,
  Ban,
  Check
} from 'lucide-react';
import { NetworkSecurityStatus } from '../../types';

interface NetworkScreenProps {
  networkData: NetworkSecurityStatus;
  onToggleFirewall: () => void;
  onTogglePort: (port: number) => void;
}

interface PortDetail {
  port: number;
  service: string;
  protocol: string;
  direction: string;
  trafficPct: number;
  essential?: boolean;
}

const PORT_CATALOG: Record<number, Omit<PortDetail, 'port'>> = {
  443: { service: 'HTTPS / TLS 1.3', protocol: 'TCP', direction: 'Outbound', trafficPct: 74, essential: true },
  80: { service: 'HTTP Web', protocol: 'TCP', direction: 'Outbound', trafficPct: 28 },
  22: { service: 'OpenSSH Daemon', protocol: 'TCP', direction: 'Inbound / Local', trafficPct: 12 },
  53: { service: 'Encrypted DNS (DoH)', protocol: 'UDP', direction: 'Outbound', trafficPct: 41, essential: true },
  8080: { service: 'Local Dev Proxy', protocol: 'TCP', direction: 'Loopback', trafficPct: 19 }
};

const BLOCKED_PROBES = [
  { rank: 1, ip: '194.26.135.88', vector: 'TCP Port Scan (22/23)', time: '14m ago', hits: 7 },
  { rank: 2, ip: '45.148.10.214', vector: 'ICMP Ping Sweep', time: '42m ago', hits: 4 },
  { rank: 3, ip: '91.240.118.172', vector: 'Malformed TLS Handshake', time: '1h ago', hits: 3 }
];

const CompactRing: React.FC<{ percent: number; color: string; label?: string }> = ({
  percent,
  color,
  label
}) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = 42;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative w-[92px] h-[92px] shrink-0 flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="#272F3F"
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
            transition: 'stroke-dashoffset 450ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold text-white utility-mono leading-none">
          {Math.round(clamped)}%
        </span>
        {label && <span className="text-[10px] text-[#8B95A8] mt-1">{label}</span>}
      </div>
    </div>
  );
};

export const NetworkScreen: React.FC<NetworkScreenProps> = ({
  networkData,
  onToggleFirewall,
  onTogglePort
}) => {
  const [auditing, setAuditing] = useState(false);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [portFilter, setPortFilter] = useState<'all' | 'open' | 'blocked'>('all');

  const allPorts = [443, 80, 22, 53, 8080];

  const handleRunAudit = () => {
    setAuditing(true);
    setTimeout(() => {
      setAuditing(false);
      setAuditMessage(
        `Verified ${networkData.encryption} cipher suite · Zero DNS leaks · ${networkData.openPorts.length} active ports.`
      );
    }, 900);
  };

  const visiblePorts = allPorts.filter((p) => {
    const isOpen = networkData.openPorts.includes(p);
    if (portFilter === 'open') return isOpen;
    if (portFilter === 'blocked') return !isOpen;
    return true;
  });

  const defenseScore = networkData.firewallActive ? (networkData.dnsLeakDetected ? 82 : 100) : 42;

  return (
    <div className="flex flex-col h-full bg-[#101319] text-[#E6EDF5]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#212734] bg-[#141821] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#122D28] border border-[#1E5247] flex items-center justify-center text-[#19C986]">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-white leading-tight">
              Network Guardian
            </h2>
            <p className="text-xs text-[#8894A8] utility-mono">
              Gateway {networkData.publicIp} · {networkData.ssid}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleFirewall}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              networkData.firewallActive
                ? 'bg-[#102922] border-[#1D5444] text-[#19C986] hover:bg-[#14352B]'
                : 'bg-[#2B171B] border-[#5C2630] text-[#F87171] hover:bg-[#3A1E24]'
            }`}
          >
            {networkData.firewallActive ? (
              <Shield className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            <span>Firewall: {networkData.firewallActive ? 'Enabled' : 'Disabled'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto utility-scroll p-6">
        <div className="max-w-[1260px] mx-auto space-y-5">
          {/* ROW 1: 3 Cores-Style Ring Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Wi-Fi Link & Encryption */}
            <div className="bg-[#171C26] border border-[#262E3D] rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-md bg-[#222A39] flex items-center justify-center text-[#19C986]">
                  <Wifi className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Wi-Fi Protocol</h3>
              </div>
              <p className="text-xs text-[#8C98AD] mb-4">
                {networkData.ssid} · {networkData.encryption}
              </p>
              <div className="flex items-center gap-4">
                <CompactRing percent={96} color="#19C986" label="Signal" />
                <div className="flex-1 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#CBD5E1]">Link Stability</span>
                      <span className="utility-mono text-[#8C98AD]">96%</span>
                    </div>
                    <div className="h-1.5 bg-[#272F3F] rounded-full overflow-hidden">
                      <div className="h-full bg-[#19C986] rounded-full" style={{ width: '96%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#CBD5E1]">DNS Privacy</span>
                      <span className="utility-mono text-[#19C986]">
                        {networkData.dnsLeakDetected ? 'Leak' : 'No Leak'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#272F3F] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: networkData.dnsLeakDetected ? '40%' : '100%',
                          backgroundColor: networkData.dnsLeakDetected ? '#F59E0B' : '#19C986'
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-[#8C98AD] utility-mono">
                    5 GHz · Channel 149 · -48 dBm
                  </div>
                </div>
              </div>
            </div>

            {/* Firewall Shield */}
            <div className="bg-[#171C26] border border-[#262E3D] rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-md bg-[#222A39] flex items-center justify-center text-[#38BDF8]">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Firewall Shield</h3>
              </div>
              <p className="text-xs text-[#8C98AD] mb-4">
                {networkData.firewallActive
                  ? 'Stateful Packet Inspection Active'
                  : 'Protection Paused — Enable immediately'}
              </p>
              <div className="flex items-center gap-4">
                <CompactRing
                  percent={defenseScore}
                  color={networkData.firewallActive ? '#38BDF8' : '#F87171'}
                  label="Defense"
                />
                <div className="flex-1 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#CBD5E1]">Probes Blocked</span>
                      <span className="utility-mono text-[#F59E0B]">{networkData.threatsBlockedToday} today</span>
                    </div>
                    <div className="h-1.5 bg-[#272F3F] rounded-full overflow-hidden">
                      <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#CBD5E1]">Authorized Ports</span>
                      <span className="utility-mono text-[#CBD5E1]">{networkData.openPorts.length} open</span>
                    </div>
                    <div className="h-1.5 bg-[#272F3F] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#38BDF8] rounded-full"
                        style={{ width: `${Math.min(100, networkData.openPorts.length * 20)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-[#8C98AD]">
                    Stealth Mode: {networkData.firewallActive ? 'Enabled' : 'Inactive'}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Throughput */}
            <div className="bg-[#171C26] border border-[#262E3D] rounded-2xl p-5">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-md bg-[#222A39] flex items-center justify-center text-[#A78BFA]">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Throughput</h3>
              </div>
              <p className="text-xs text-[#8C98AD] mb-4">
                Public IP {networkData.publicIp} · 11 ms RTT
              </p>
              <div className="flex items-center gap-4">
                <CompactRing percent={34} color="#38BDF8" label="Load" />
                <div className="flex-1 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#CBD5E1]">Download</span>
                      <span className="utility-mono text-[#38BDF8]">148.4 Mbps</span>
                    </div>
                    <div className="h-1.5 bg-[#272F3F] rounded-full overflow-hidden">
                      <div className="h-full bg-[#38BDF8] rounded-full" style={{ width: '58%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#CBD5E1]">Upload</span>
                      <span className="utility-mono text-[#A78BFA]">42.1 Mbps</span>
                    </div>
                    <div className="h-1.5 bg-[#272F3F] rounded-full overflow-hidden">
                      <div className="h-full bg-[#A78BFA] rounded-full" style={{ width: '28%' }} />
                    </div>
                  </div>
                  <div className="text-[11px] text-[#8C98AD] utility-mono">
                    Packet Loss: 0.00%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Asymmetric Inspector Grid (8 cols / 4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Active Port Monitor Table */}
            <div className="lg:col-span-8 bg-[#171C26] border border-[#262E3D] rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Active Port Monitor</h3>
                  <p className="text-xs text-[#8894A8] mt-0.5">
                    Inspect and restrict listening TCP/UDP services on this workstation
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-[#10141C] border border-[#242C3B] p-1 rounded-lg">
                  {(['all', 'open', 'blocked'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPortFilter(tab)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                        portFilter === tab
                          ? 'bg-[#242D3E] text-white'
                          : 'text-[#8894A8] hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-[#242C3B] rounded-xl overflow-hidden bg-[#11151E]">
                <div className="grid grid-cols-12 px-4 py-2.5 text-[11px] font-medium text-[#7D8A9F] border-b border-[#212836] bg-[#141924]">
                  <div className="col-span-2">Port</div>
                  <div className="col-span-4">Service</div>
                  <div className="col-span-2">Traffic</div>
                  <div className="col-span-2">State</div>
                  <div className="col-span-2 text-right">Rule</div>
                </div>

                <div className="divide-y divide-[#1E2432]">
                  {visiblePorts.map((portNum) => {
                    const meta = PORT_CATALOG[portNum] || {
                      service: 'Custom Socket',
                      protocol: 'TCP',
                      direction: 'Local',
                      trafficPct: 10
                    };
                    const isOpen = networkData.openPorts.includes(portNum);
                    return (
                      <div
                        key={portNum}
                        className="grid grid-cols-12 items-center px-4 py-3 text-xs hover:bg-[#171D29] transition-colors"
                      >
                        <div className="col-span-2 font-semibold utility-mono text-white">
                          :{portNum}
                          <span className="text-[10px] text-[#7D8A9F] ml-1.5">{meta.protocol}</span>
                        </div>
                        <div className="col-span-4">
                          <div className="font-medium text-[#E2E8F0]">{meta.service}</div>
                          <div className="text-[11px] text-[#7D8A9F]">{meta.direction}</div>
                        </div>
                        <div className="col-span-2 pr-3">
                          <div className="h-1.5 bg-[#252D3D] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#38BDF8] rounded-full"
                              style={{ width: isOpen ? `${meta.trafficPct}%` : '0%' }}
                            />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span
                            className={`inline-flex items-center gap-1.5 font-medium ${
                              isOpen ? 'text-[#19C986]' : 'text-[#F87171]'
                            }`}
                          >
                            {isOpen ? <Lock className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                            {isOpen ? 'Authorized' : 'Blocked'}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <button
                            type="button"
                            onClick={() => onTogglePort(portNum)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                              isOpen
                                ? 'bg-[#24181D] border-[#4B2630] text-[#F87171] hover:bg-[#321F26]'
                                : 'bg-[#112A22] border-[#1E5040] text-[#19C986] hover:bg-[#16382D]'
                            }`}
                          >
                            {isOpen ? 'Block' : 'Allow'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Audit Action & Blocked Intrusion Probes */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              <button
                type="button"
                disabled={auditing}
                onClick={handleRunAudit}
                className="w-full py-3.5 px-5 rounded-xl bg-[#17C983] hover:bg-[#20DA91] text-[#051B12] font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
              >
                {auditing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                <span>{auditing ? 'Auditing Packets & DNS...' : 'Run Deep Network Audit'}</span>
              </button>

              {auditMessage && (
                <div className="bg-[#102620] border border-[#1E5141] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#A7F3D0]">
                  <CheckCircle2 className="w-4 h-4 text-[#19C986] shrink-0 mt-0.5" />
                  <span>{auditMessage}</span>
                </div>
              )}

              {/* Blocked Intrusion Probes (CleanC Ranking Style) */}
              <div className="bg-[#171C26] border border-[#262E3D] rounded-2xl p-4 flex-1">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-sm font-semibold text-white">Recent Blocked Probes</h3>
                  <span className="text-[11px] utility-mono text-[#F59E0B]">
                    {networkData.threatsBlockedToday} total
                  </span>
                </div>
                <div className="space-y-2.5">
                  {BLOCKED_PROBES.map((probe) => {
                    const badgeStyle =
                      probe.rank === 1
                        ? 'bg-[#F5B731] text-[#1A1303]'
                        : probe.rank === 2
                        ? 'bg-[#9AA3B2] text-[#111419]'
                        : 'bg-[#D97736] text-[#1C0D03]';
                    return (
                      <div
                        key={probe.ip}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#121620] border border-[#222938]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-md text-xs font-bold utility-mono flex items-center justify-center shrink-0 ${badgeStyle}`}
                          >
                            {probe.rank}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold utility-mono text-white truncate">
                              {probe.ip}
                            </div>
                            <div className="text-[11px] text-[#8894A8] truncate">{probe.vector}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-semibold utility-mono text-[#F87171]">
                            {probe.hits}x
                          </div>
                          <div className="text-[10px] text-[#7D8A9F]">{probe.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-[#232B3A] flex items-center justify-between text-xs">
                  <span className="text-[#8894A8]">Encryption Suite</span>
                  <span className="text-[#19C986] font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    AES-256-GCMP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
