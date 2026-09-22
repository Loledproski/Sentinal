import { motion } from 'motion/react';
import { Mic, MicOff, Settings, Activity, Shield, Globe, Database, TrendingUp, Send, HardDrive } from 'lucide-react';
import { useJarvis } from './lib/useJarvis';
import { useState, useEffect } from 'react';
import { SentinelModals } from './components/SentinelModals';
import { SentinelTools } from './services/tools';
import { routeUserCommand } from './ai/orchestrator';
import { StorageBreakdown, NetworkSecurityStatus, SecurityProcess, SystemOverview } from './types';

export default function App() {
  const { isConnected, volume, error, toggleConnection } = useJarvis();
  const [time, setTime] = useState(new Date());
  const [activeModal, setActiveModal] = useState<'SCAN' | 'NETWORK' | 'THREATS' | 'INSIGHTS' | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>("I'm online and ready.");
  const [subMessage, setSubMessage] = useState<string>("How can I help you today?");

  // Data states
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
      { name: 'temp_crash_dump.dmp', sizeMB: 1200, path: 'C:/Windows/Minidump/crash.dmp', risk: 'safe' }
    ]
  });

  const [networkData, setNetworkData] = useState<NetworkSecurityStatus>({
    ssid: 'Sentinel-Secure-5G',
    encryption: 'WPA3-Personal',
    isSafe: true,
    publicIp: '185.124.90.14',
    dnsLeakDetected: false,
    firewallActive: true,
    openPorts: [443, 80, 22],
    threatsBlockedToday: 14
  });

  const [threatsData, setThreatsData] = useState<SecurityProcess[]>([
    { pid: 1420, name: 'sentinel-core.exe', cpu: 1.2, memoryMB: 184, status: 'verified', path: 'C:/Program Files/Sentinel/core.exe' },
    { pid: 3824, name: 'chrome.exe (24 tabs)', cpu: 14.5, memoryMB: 3420, status: 'verified', path: 'C:/Program Files/Google/Chrome/chrome.exe' },
    { pid: 7810, name: 'unknown_bg_updater.exe', cpu: 0.1, memoryMB: 28, status: 'suspicious', path: 'C:/Users/AppData/Local/Temp/updater.exe' },
    { pid: 402, name: 'svchost.exe', cpu: 0.4, memoryMB: 140, status: 'system', path: 'C:/Windows/System32/svchost.exe' }
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
    status: 'OPTIMAL'
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCommandSubmit = async (queryText?: string) => {
    const text = queryText || commandInput;
    if (!text.trim()) return;

    setCommandInput('');
    setStatusMessage(`ROUTING: "${text.toUpperCase()}"`);
    setSubMessage("AI Orchestrator analyzing intent & selecting tool...");

    const decision = await routeUserCommand(text);

    setTimeout(async () => {
      setStatusMessage("ACTION EXECUTED");
      setSubMessage(decision.explanation);

      if (decision.tool === 'scanStorage') {
        setActiveModal('SCAN');
      } else if (decision.tool === 'cleanStorage') {
        setActiveModal('SCAN');
      } else if (decision.tool === 'checkNetworkSecurity') {
        setActiveModal('NETWORK');
      } else if (decision.tool === 'getProcessThreats') {
        setActiveModal('THREATS');
      } else if (decision.tool === 'getSystemOverview') {
        setActiveModal('INSIGHTS');
      } else if (decision.tool === 'launchApp') {
        await SentinelTools.launchApp(decision.args?.appName || 'Chrome');
      }
    }, 600);
  };

  const handleModalAction = async (toolName: string) => {
    if (toolName === 'cleanStorage') {
      const result = await SentinelTools.cleanStorage();
      setStorageData((prev) => ({
        ...prev,
        tempFilesMB: 0,
        freeSpaceGB: prev.freeSpaceGB + 4.82,
        usedSpaceGB: prev.usedSpaceGB - 4.82
      }));
      setStatusMessage("STORAGE OPTIMIZED");
      setSubMessage(result.message);
    }
  };

  const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = time.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

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
          <h1 className="text-cyan-400 tracking-[0.3em] text-3xl font-semibold drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">SENTINEL</h1>
          <p className="text-cyan-600 text-xs tracking-[0.2em] mt-1">AI CYBERSECURITY GUARDIAN</p>
        </div>
      </div>

      {/* Header Right */}
      <div className="absolute top-8 right-8 flex flex-col items-end">
        <div className="text-cyan-400 text-3xl tracking-widest font-light">{timeString}</div>
        <div className="text-cyan-700 text-sm tracking-widest mb-3 mt-1">{dateString}</div>
        <div className="inline-flex items-center gap-2 border border-cyan-800/50 rounded-full px-5 py-2 bg-[#030B14]">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse" />
          <span className="text-cyan-400 text-xs tracking-widest font-medium">SECURE</span>
        </div>
      </div>

      {/* Bottom Left Status */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-2">
        <div className="text-cyan-700 text-xs tracking-widest">SYSTEM STATUS</div>
        <div className="inline-flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
          <span className="text-cyan-400 text-sm tracking-widest">SECURE</span>
        </div>
      </div>

      {/* Right Sidebar Nav (Click to open diagnostic HUDs) */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-10 z-20">
        {[
          { icon: HardDrive, label: 'SCAN', modal: 'SCAN' as const },
          { icon: Globe, label: 'NETWORK', modal: 'NETWORK' as const },
          { icon: Database, label: 'THREATS', modal: 'THREATS' as const },
          { icon: TrendingUp, label: 'INSIGHTS', modal: 'INSIGHTS' as const }
        ].map((item, idx) => (
          <div 
            key={idx} 
            onClick={() => setActiveModal(item.modal)}
            className="flex items-center gap-4 group cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full border border-cyan-800/50 flex items-center justify-center bg-[#030B14] group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all">
              <item.icon className="w-6 h-6 text-cyan-600 group-hover:text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-cyan-500 text-xs tracking-widest group-hover:text-cyan-300 transition-colors">{item.label}</span>
              <div className="w-2 h-2 rounded-full bg-cyan-800 mt-1.5 group-hover:bg-cyan-400 shadow-[0_0_5px_rgba(6,182,212,0)] group-hover:shadow-[0_0_5px_rgba(6,182,212,0.8)] transition-all" />
            </div>
          </div>
        ))}
      </div>

      {/* Center UI */}
      <div className="flex flex-col items-center justify-center z-10 w-full max-w-4xl mt-[-5vh]">
        
        {/* Glowing Orb */}
        <div className="relative w-[420px] h-[420px] flex items-center justify-center mb-12">
          {/* Outer glow aura */}
          <div className="absolute inset-0 rounded-full bg-cyan-500/5 blur-[80px]" />
          
          {/* Ring 1 - Outer thin */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border border-cyan-900/50 rounded-full border-t-cyan-500/80 border-r-cyan-500/30"
          />
          
          {/* Ring 2 - Dashed */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 border-[2px] border-dashed border-cyan-800/40 rounded-full border-l-cyan-400/60"
          />

          {/* Ring 3 - Solid with glow */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute inset-10 border-2 border-cyan-500/20 rounded-full shadow-[inset_0_0_30px_rgba(6,182,212,0.1)] border-b-cyan-400/80"
          />

          {/* Ring 4 - Inner tick marks */}
          <div className="absolute inset-16 border-[4px] border-dotted border-cyan-700/30 rounded-full" />

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h2 className="text-6xl font-light tracking-[0.3em] text-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">SENTINEL</h2>
            <p className="text-[11px] tracking-[0.3em] text-cyan-600 mt-4">AI CYBERSECURITY GUARDIAN</p>
          </div>
          
          {/* Bottom highlight arc */}
          <div className="absolute -bottom-2 w-64 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-[2px] opacity-50" />
          <div className="absolute -bottom-2 w-32 h-1 bg-cyan-300 blur-[8px] opacity-70" />
        </div>

        {/* Status Text & Audio Waveform */}
        <div className="flex flex-col items-center mb-10 h-28">
          <h3 className="text-cyan-100 text-2xl tracking-wide font-light mb-3">
            {error ? 'SYSTEM ERROR' : statusMessage}
          </h3>
          <p className="text-cyan-500 text-lg tracking-wide mb-8">
            {error ? error : subMessage}
          </p>

          {/* Audio Visualizer Simulator */}
          <div className="flex items-center justify-center gap-2 h-8">
            {Array.from({ length: 40 }).map((_, i) => {
              const centerDist = Math.abs(i - 20);
              const maxH = 32 - (centerDist * 1.5);
              const isAnim = isConnected && volume > 0;
              const h = isAnim ? Math.max(4, Math.random() * maxH * (volume * 10)) : (centerDist < 10 ? 4 : 2);
              
              return (
                <motion.div
                  key={i}
                  animate={{ height: h }}
                  transition={{ type: "tween", duration: 0.1 }}
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
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isConnected 
                  ? 'bg-cyan-500/20 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] text-cyan-300' 
                  : 'bg-cyan-950 border border-cyan-800/50 text-cyan-600 hover:text-cyan-400 hover:border-cyan-600'
              }`}
            >
              {isConnected ? <Mic className="w-6 h-6 animate-pulse" /> : <MicOff className="w-6 h-6" />}
            </button>

            <input 
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder={isConnected ? "Listening for voice..." : "Speak or type your command (e.g. 'clean storage', 'check wifi')..."}
              className="flex-1 bg-transparent border-none outline-none text-cyan-100 placeholder-cyan-700 px-6 text-base tracking-wide font-light"
            />

            <button 
              type="submit"
              className="w-14 h-14 rounded-full flex items-center justify-center text-cyan-600 hover:text-cyan-400 transition-colors"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </form>

        {/* Suggestions */}
        <div className="mt-10 flex items-center gap-4 text-sm">
          <span className="text-cyan-700 tracking-widest">Try saying:</span>
          <span 
            onClick={() => handleCommandSubmit("clean storage")}
            className="text-cyan-500 tracking-wide cursor-pointer hover:text-cyan-300 transition-colors"
          >
            "Free up space"
          </span>
          <span className="text-cyan-800">•</span>
          <span 
            onClick={() => handleCommandSubmit("check network security")}
            className="text-cyan-500 tracking-wide cursor-pointer hover:text-cyan-300 transition-colors"
          >
            "Is this Wi-Fi safe?"
          </span>
          <span className="text-cyan-800">•</span>
          <span 
            onClick={() => handleCommandSubmit("check process threats")}
            className="text-cyan-500 tracking-wide cursor-pointer hover:text-cyan-300 transition-colors"
          >
            "Scan background threats"
          </span>
        </div>

      </div>

      {/* Active Diagnostic HUD Modal */}
      {activeModal && (
        <SentinelModals
          type={activeModal}
          onClose={() => setActiveModal(null)}
          onRunAction={handleModalAction}
          storageData={storageData}
          networkData={networkData}
          threatsData={threatsData}
          systemData={systemData}
        />
      )}
    </div>
  );
}

