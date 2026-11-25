import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  HardDrive,
  Globe,
  Shield,
  Cpu,
  X,
  Home,
  Lock,
} from 'lucide-react';
import {
  StorageBreakdown,
  NetworkSecurityStatus,
  SecurityProcess,
  SystemOverview,
  RamBoostResult,
  SystemPermissionsState,
} from '../types';
import { ScanScreen } from './screens/ScanScreen';
import { NetworkScreen } from './screens/NetworkScreen';
import { ThreatsScreen } from './screens/ThreatsScreen';
import { InsightsScreen } from './screens/InsightsScreen';

export type DiagnosticScreenType = 'SCAN' | 'NETWORK' | 'THREATS' | 'INSIGHTS';

interface ModalProps {
  type: DiagnosticScreenType;
  onClose: () => void;
  onSwitchScreen: (screen: DiagnosticScreenType) => void;
  onOpenPermissions: () => void;
  onCleanItems: (freedMB: number, clearedIds: string[]) => void;
  onDeleteLargeFile: (fileName: string, sizeMB: number) => void;
  onToggleFirewall: () => void;
  onTogglePort: (port: number) => void;
  onQuarantineProcess: (pid: number) => void;
  onTrustProcess: (pid: number) => void;
  onRunRamBoost: (options: { trimWorkingSets: boolean; targetPids: number[] }) => Promise<RamBoostResult>;
  onRefreshTelemetry?: () => Promise<void>;
  fps: number;
  frameTimeMs: number;
  overlayVisible: boolean;
  onToggleOverlay: () => void;
  permissions: SystemPermissionsState;
  lastRamBoost: RamBoostResult | null;
  storageData: StorageBreakdown;
  networkData: NetworkSecurityStatus;
  threatsData: SecurityProcess[];
  systemData: SystemOverview;
}

export const SentinelModals: React.FC<ModalProps> = ({
  type,
  onClose,
  onSwitchScreen,
  onOpenPermissions,
  onCleanItems,
  onDeleteLargeFile,
  onToggleFirewall,
  onTogglePort,
  onQuarantineProcess,
  onTrustProcess,
  onRunRamBoost,
  onRefreshTelemetry,
  fps,
  frameTimeMs,
  overlayVisible,
  onToggleOverlay,
  permissions,
  lastRamBoost,
  storageData,
  networkData,
  threatsData,
  systemData,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const suspiciousCount = threatsData.filter((p) => p.status === 'suspicious').length;

  const isCoresTheme = type === 'INSIGHTS';
  const railBg = isCoresTheme
    ? 'bg-[#120F18] border-[#282236]'
    : 'bg-[#090B0E] border-[#1D222B]';
  const frameBorder = isCoresTheme ? 'border-[#312A42]' : 'border-[#232934]';

  const navItems: Array<{
    id: DiagnosticScreenType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    activeAccent: string;
    activeText: string;
    badge?: number;
  }> = [
    {
      id: 'SCAN',
      label: 'Storage Scan',
      icon: HardDrive,
      activeAccent: 'bg-[#17C983]',
      activeText: 'text-[#17C983] bg-[#132922]',
    },
    {
      id: 'NETWORK',
      label: 'Network Guardian',
      icon: Globe,
      activeAccent: 'bg-[#19C986]',
      activeText: 'text-[#19C986] bg-[#122625]',
    },
    {
      id: 'THREATS',
      label: 'Threat Audit',
      icon: Shield,
      activeAccent: 'bg-[#F59E0B]',
      activeText: 'text-[#F59E0B] bg-[#281E13]',
      badge: suspiciousCount > 0 ? suspiciousCount : undefined,
    },
    {
      id: 'INSIGHTS',
      label: 'System Insights & RAM Boost',
      icon: Cpu,
      activeAccent: 'bg-[#38BDF8]',
      activeText: 'text-[#38BDF8] bg-[#262036]',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-text utility-shell"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-[1380px] h-[90vh] rounded-2xl border ${frameBorder} shadow-[0_24px_80px_rgba(0,0,0,0.75)] flex overflow-hidden`}
      >
        {/* Cores-Inspired Slim Left Icon Rail */}
        <aside
          className={`w-[64px] shrink-0 border-r ${railBg} flex flex-col items-center justify-between py-4 transition-colors duration-200`}
        >
          <div className="flex flex-col items-center gap-3 w-full">
            {/* Return to Sentinel Orb HUD */}
            <button
              type="button"
              onClick={onClose}
              title="Back to Sentinel HUD"
              aria-label="Back to Sentinel HUD"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8B95A7] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Home className="w-[19px] h-[19px]" />
            </button>

            <div className="w-7 h-px bg-white/10 my-1" />

            {/* Diagnostic Module Icons */}
            <nav className="flex flex-col items-center gap-2.5 w-full" aria-label="Diagnostic Modules">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSwitchScreen(item.id)}
                    title={item.label}
                    aria-label={item.label}
                    className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? item.activeText
                        : 'text-[#7F889B] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isActive && (
                      <span
                        className={`absolute -left-3 top-2 bottom-2 w-1 rounded-r-full ${item.activeAccent}`}
                      />
                    )}
                    <Icon className="w-[19px] h-[19px]" />
                    {item.badge !== undefined && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#F59E0B] text-[#1A1303] text-[10px] font-bold utility-mono flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col items-center gap-2.5">
            {/* Windows API Permission Status Button */}
            <button
              type="button"
              onClick={onOpenPermissions}
              title={
                permissions.granted
                  ? `Windows API Access: ${permissions.mode.toUpperCase()}`
                  : 'Configure Windows API & Hardware Permission'
              }
              aria-label="Windows API & Hardware Permission"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                permissions.granted
                  ? 'text-[#17C983] bg-[#102922] hover:bg-[#15362C]'
                  : 'text-[#F59E0B] bg-[#291F12] hover:bg-[#382917]'
              }`}
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Close Button at Bottom of Rail */}
            <button
              type="button"
              onClick={onClose}
              title="Close Window (Esc)"
              aria-label="Close Window"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#7F889B] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* Active Diagnostic Screen Viewport */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          {type === 'SCAN' && (
            <ScanScreen
              storageData={storageData}
              onCleanItems={onCleanItems}
              onDeleteLargeFile={onDeleteLargeFile}
            />
          )}
          {type === 'NETWORK' && (
            <NetworkScreen
              networkData={networkData}
              onToggleFirewall={onToggleFirewall}
              onTogglePort={onTogglePort}
            />
          )}
          {type === 'THREATS' && (
            <ThreatsScreen
              threatsData={threatsData}
              onQuarantineProcess={onQuarantineProcess}
              onTrustProcess={onTrustProcess}
            />
          )}
          {type === 'INSIGHTS' && (
            <InsightsScreen
              systemData={systemData}
              processes={threatsData}
              lastRamBoost={lastRamBoost}
              fps={fps}
              frameTimeMs={frameTimeMs}
              overlayVisible={overlayVisible}
              onToggleOverlay={onToggleOverlay}
              onRunRamBoost={onRunRamBoost}
              onRefreshTelemetry={onRefreshTelemetry}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};
