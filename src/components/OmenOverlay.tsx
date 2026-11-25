import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GripVertical, Pin, ExternalLink } from 'lucide-react';
import { SystemOverview } from '../types';

interface OmenOverlayProps {
  visible: boolean;
  systemData: SystemOverview;
  fps: number;
  onClickOverlay?: () => void;
  onCloseOverlay?: () => void;
}

const POS_STORAGE_KEY = 'sentinel_omen_overlay_pos_v1';

export const OmenOverlay: React.FC<OmenOverlayProps> = ({
  visible,
  systemData,
  fps,
  onClickOverlay,
  onCloseOverlay,
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const isElectronDesktop = Boolean((window as any).electronAPI?.isElectron);

  const [isPinned, setIsPinned] = useState<boolean>(false);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem(POS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<{ offsetX: number; offsetY: number }>({ offsetX: 0, offsetY: 0 });

  // Reset to draggable state when freshly opened via Shift + F3 so user can position & pin it
  useEffect(() => {
    if (visible) {
      setIsPinned(false);
    }
  }, [visible]);

  const clampPosition = useCallback((x: number, y: number) => {
    const el = overlayRef.current;
    const width = el?.offsetWidth || 540;
    const height = el?.offsetHeight || 44;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - height - 8);
    return {
      x: Math.min(maxX, Math.max(8, Math.round(x))),
      y: Math.min(maxY, Math.max(8, Math.round(y))),
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        return clampPosition(prev.x, prev.y);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  // In Electron Desktop App, the native OS frameless Always-On-Top overlayWindow renders the bar over Chrome & all apps
  if (isElectronDesktop) {
    return null;
  }

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPinned) {
      // Pin locks the overlay at this exact screen position
      setIsPinned(true);
    } else {
      // Unpin immediately dismisses/hides the overlay ("when i unpined it will be gone")
      setIsPinned(false);
      if (onCloseOverlay) {
        onCloseOverlay();
      }
    }
  };

  const handleResetCenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinned) return;
    setPosition(null);
    try {
      localStorage.removeItem(POS_STORAGE_KEY);
    } catch {}
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPinned) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const el = overlayRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragOffsetRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setIsDragging(true);
    el.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isPinned) return;
    const nextX = e.clientX - dragOffsetRef.current.offsetX;
    const nextY = e.clientY - dragOffsetRef.current.offsetY;
    const clamped = clampPosition(nextX, nextY);
    setPosition(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      overlayRef.current?.releasePointerCapture(e.pointerId);
    } catch {}

    if (position) {
      try {
        localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(position));
      } catch {}
    }
  };

  const cpuUsage = Math.round(systemData.cpuUsage);
  const cpuTemp = Math.round(systemData.cpuTemp);
  const gpuUsage = Math.round(systemData.gpuUsage);
  const gpuTemp = Math.round(systemData.gpuTemp);
  const ramPercent = (
    (Math.max(0.5, systemData.ramUsed) / Math.max(4, systemData.ramTotal)) *
    100
  ).toFixed(1);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleResetCenter}
          style={
            position
              ? {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  transform: 'none',
                }
              : undefined
          }
          className={`fixed z-[95] select-none utility-shell ${
            position ? '' : 'top-3 left-1/2 -translate-x-1/2'
          } ${
            isPinned
              ? 'cursor-default'
              : isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
          }`}
        >
          <div
            className={`bg-[#050608]/95 rounded-md px-3.5 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-md flex items-center gap-5 whitespace-nowrap border transition-colors ${
              isPinned
                ? 'border-[#00E676]/50 shadow-[0_0_20px_rgba(0,230,118,0.18)]'
                : isDragging
                ? 'border-[#38BDF8]/70'
                : 'border-white/15 hover:border-white/25'
            }`}
          >
            {/* Drag Grip Handle */}
            <div
              title={
                isPinned
                  ? 'Overlay is pinned. Click PINNED to unpin & hide.'
                  : 'Drag to move anywhere on screen (Double-click to re-center)'
              }
              className={`flex items-center gap-1 pr-1 border-r border-white/10 ${
                isPinned ? 'text-[#00E676]/70' : 'text-[#9E95B0] hover:text-white'
              }`}
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* CPU Block */}
            <div className="flex items-baseline gap-2">
              <span className="text-[14px] font-extrabold tracking-wide text-white">
                CPU
              </span>
              <span className="text-[14px] font-bold text-white tabular-nums">
                {cpuUsage}%
              </span>
              <span
                className={`text-[14px] font-bold tabular-nums ${
                  cpuTemp >= 82
                    ? 'text-[#FB7185]'
                    : cpuTemp >= 72
                    ? 'text-[#F59E0B]'
                    : 'text-[#00E676]'
                }`}
              >
                {cpuTemp}°C
              </span>
            </div>

            {/* GPU Block */}
            <div className="flex items-baseline gap-2">
              <span className="text-[14px] font-extrabold tracking-wide text-white">
                GPU
              </span>
              <span className="text-[14px] font-bold text-white tabular-nums">
                {gpuUsage}%
              </span>
              <span
                className={`text-[14px] font-bold tabular-nums ${
                  gpuTemp >= 82
                    ? 'text-[#FB7185]'
                    : gpuTemp >= 72
                    ? 'text-[#F59E0B]'
                    : 'text-[#00E676]'
                }`}
              >
                {gpuTemp}°C
              </span>
            </div>

            {/* RAM Block */}
            <div className="flex items-baseline gap-2">
              <span className="text-[14px] font-extrabold tracking-wide text-white">
                RAM
              </span>
              <span className="text-[14px] font-bold text-white tabular-nums">
                {ramPercent}%
              </span>
            </div>

            {/* FPS Block */}
            <div className="flex items-baseline gap-2">
              <span className="text-[14px] font-extrabold tracking-wide text-white">
                FPS
              </span>
              <span className="text-[14px] font-bold text-white tabular-nums min-w-[22px] text-right">
                {fps}
              </span>
            </div>

            {/* Pin / Unpin Control */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
              <button
                type="button"
                onClick={handleTogglePin}
                title={
                  isPinned
                    ? 'Click to Unpin and hide overlay'
                    : 'Pin overlay at this exact screen spot'
                }
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  isPinned
                    ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 hover:bg-[#FB7185]/20 hover:text-[#FB7185] hover:border-[#FB7185]/40'
                    : 'bg-white/5 text-[#9E95B0] hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : '-rotate-45'}`} />
                <span>{isPinned ? 'PINNED' : 'PIN'}</span>
              </button>

              {onClickOverlay && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClickOverlay();
                  }}
                  title="Open full Insights & RAM Boost telemetry"
                  className="p-1 rounded text-[#9E95B0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
