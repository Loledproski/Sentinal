import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Cpu,
  HardDrive,
  Globe,
  Zap,
  Check,
  Lock,
  X,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { SystemPermissionsState } from '../types';

interface PermissionModalProps {
  permissions: SystemPermissionsState;
  onGrant: (mode: 'full' | 'readonly', scopes: SystemPermissionsState['scopes']) => Promise<void>;
  onRevoke: () => Promise<void>;
  onClose: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  permissions,
  onGrant,
  onRevoke,
  onClose,
}) => {
  const [scopes, setScopes] = useState<SystemPermissionsState['scopes']>({
    hardwareTelemetry: permissions.scopes.hardwareTelemetry,
    storageAnalyzer: permissions.scopes.storageAnalyzer,
    networkFirewall: permissions.scopes.networkFirewall,
    processAndRamBoost: permissions.scopes.processAndRamBoost,
  });
  const [submitting, setSubmitting] = useState(false);

  const toggleScope = (key: keyof SystemPermissionsState['scopes']) => {
    setScopes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGrant = async (mode: 'full' | 'readonly') => {
    setSubmitting(true);
    await onGrant(mode, scopes);
    setSubmitting(false);
    onClose();
  };

  const handleRevoke = async () => {
    setSubmitting(true);
    await onRevoke();
    setSubmitting(false);
  };

  const scopeList: Array<{
    key: keyof SystemPermissionsState['scopes'];
    title: string;
    subtitle: string;
    apiNote: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
  }> = [
    {
      key: 'hardwareTelemetry',
      title: 'Hardware, CPU Cores & Battery Sensors',
      subtitle: 'Read real-time per-thread CPU utilization, physical memory, and battery state.',
      apiNote: 'Win32 CIM / Node os.cpus() / Navigator Battery API',
      icon: Cpu,
      accent: 'text-[#38BDF8]',
    },
    {
      key: 'storageAnalyzer',
      title: 'Storage Volume & Temporary Cache Analyzer',
      subtitle: 'Inspect C:\\ volume capacity, temporary directories, and clean safe temp artifacts.',
      apiNote: 'PowerShell Get-PSDrive / fs.stat / Navigator StorageManager',
      icon: HardDrive,
      accent: 'text-[#17C983]',
    },
    {
      key: 'networkFirewall',
      title: 'Network Interfaces, Firewall & Port Monitor',
      subtitle: 'Audit active Wi-Fi/Ethernet interfaces, listening TCP/UDP ports, and firewall rules.',
      apiNote: 'Get-NetTCPConnection / os.networkInterfaces()',
      icon: Globe,
      accent: 'text-[#34D399]',
    },
    {
      key: 'processAndRamBoost',
      title: 'Process Forensics & OMEN-Style RAM Boost',
      subtitle: 'Trim process working sets (EmptyWorkingSet) and suspend user-selected high-RAM apps.',
      apiNote: 'Win32 psapi.dll EmptyWorkingSet / Get-Process',
      icon: Zap,
      accent: 'text-[#FB7185]',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-text utility-shell"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#13161F] border border-[#283042] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#222938] bg-[#171B26]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#112A22] border border-[#1E5342] flex items-center justify-center text-[#17C983]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Windows API & Hardware Access Permission
              </h2>
              <p className="text-xs text-[#8C98AD] mt-0.5">
                Grant Sentinel permission to query live laptop telemetry and execute RAM Boost
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8C98AD] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {permissions.granted && (
            <div className="bg-[#0F2620] border border-[#1D5242] rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs text-[#A7F3D0]">
                <CheckCircle2 className="w-4 h-4 text-[#17C983] shrink-0" />
                <span>
                  Active Session:{' '}
                  <strong className="text-white">
                    {permissions.mode === 'full' ? 'Full Windows & Hardware Control' : 'Read-Only Telemetry'}
                  </strong>
                  {permissions.platformName ? ` · ${permissions.platformName}` : ''}
                </span>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={handleRevoke}
                className="text-xs text-[#F87171] hover:underline font-medium cursor-pointer"
              >
                Revoke Access
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            {scopeList.map((item) => {
              const Icon = item.icon;
              const enabled = scopes[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleScope(item.key)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                    enabled
                      ? 'bg-[#1A202D] border-[#313C52]'
                      : 'bg-[#11141C] border-[#1F2533] opacity-65'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg bg-[#232B3B] flex items-center justify-center shrink-0 mt-0.5 ${item.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">{item.title}</div>
                      <div className="text-[11px] text-[#8C98AD] mt-0.5 leading-relaxed">
                        {item.subtitle}
                      </div>
                      <div className="text-[10px] utility-mono text-[#68758B] mt-1">
                        Bridge: {item.apiNote}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border mt-1 transition-colors ${
                      enabled
                        ? 'bg-[#17C983] border-[#17C983] text-[#051B12]'
                        : 'border-[#444E5E] bg-transparent'
                    }`}
                  >
                    {enabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-[#10131A] border border-[#202634] rounded-xl p-3.5 flex items-center justify-between text-xs text-[#8C98AD]">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span>
                Critical Windows processes (<code className="utility-mono text-[#CBD5E1]">svchost.exe</code>,{' '}
                <code className="utility-mono text-[#CBD5E1]">explorer.exe</code>,{' '}
                <code className="utility-mono text-[#CBD5E1]">lsass.exe</code>) are hardware-protected and never terminated.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#222938] bg-[#171B26] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleGrant('readonly')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#222938] hover:bg-[#2B3345] text-xs font-semibold text-[#D6DFEE] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Allow Read-Only Telemetry</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleGrant('full')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#17C983] hover:bg-[#21D890] text-[#051B12] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span>
              {submitting ? 'Connecting Windows & OS Bridge...' : 'Grant Full System & RAM Boost Access'}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
