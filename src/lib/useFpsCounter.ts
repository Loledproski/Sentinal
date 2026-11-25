import { useState, useEffect, useRef } from 'react';

/**
 * Measures real rendering frame rate (FPS) and frame time (ms) using requestAnimationFrame.
 */
export function useFpsCounter(active = true) {
  const [fps, setFps] = useState<number>(60);
  const [frameTimeMs, setFrameTimeMs] = useState<number>(16.7);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const loop = (now: number) => {
      frameCountRef.current += 1;
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 500) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        const avgFrameMs = +(elapsed / Math.max(1, frameCountRef.current)).toFixed(1);
        setFps(currentFps);
        setFrameTimeMs(avgFrameMs);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [active]);

  return { fps, frameTimeMs };
}
