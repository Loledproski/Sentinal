import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  Search,
  Sparkles,
  Folder,
  FileArchive,
  Trash2,
  Check,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Layers,
  FileText,
} from 'lucide-react';
import { StorageBreakdown, CleanableCategoryDetail } from '../../types';

interface ScanScreenProps {
  storageData: StorageBreakdown;
  onCleanItems: (freedMB: number, clearedIds: string[]) => void;
  onDeleteLargeFile: (fileName: string, sizeMB: number) => void;
}

interface TreemapChild {
  id: string;
  name: string;
  path: string;
  sizeGB: number;
  weight: number;
}

interface TreemapGroup {
  id: string;
  name: string;
  path: string;
  sizeGB: number;
  bg: string;
  hoverBg: string;
  accent: string;
  children: TreemapChild[];
}

const TREEMAP_GROUPS: TreemapGroup[] = [
  {
    id: 'users',
    name: 'Users',
    path: 'C:\\Users',
    sizeGB: 138.4,
    bg: '#2F7AF4',
    hoverBg: '#3D87FF',
    accent: '#93C5FD',
    children: [
      { id: 'u-docs', name: 'Admin/Documents', path: 'C:\\Users\\Admin\\Documents', sizeGB: 54.2, weight: 40 },
      { id: 'u-proj', name: 'Admin/Projects', path: 'C:\\Users\\Admin\\Projects', sizeGB: 41.8, weight: 30 },
      { id: 'u-media', name: 'Admin/Media', path: 'C:\\Users\\Admin\\Media', sizeGB: 26.5, weight: 19 },
      { id: 'u-dl', name: 'Downloads', path: 'C:\\Users\\Admin\\Downloads', sizeGB: 15.9, weight: 11 },
    ],
  },
  {
    id: 'program-files',
    name: 'Program Files',
    path: 'C:\\Program Files',
    sizeGB: 74.6,
    bg: '#7C56F3',
    hoverBg: '#8B68FF',
    accent: '#C4B5FD',
    children: [
      { id: 'pf-docker', name: 'Docker/WSL', path: 'C:\\Program Files\\Docker', sizeGB: 28.4, weight: 38 },
      { id: 'pf-nvidia', name: 'NVIDIA', path: 'C:\\Program Files\\NVIDIA Corporation', sizeGB: 18.2, weight: 25 },
      { id: 'pf-google', name: 'Google', path: 'C:\\Program Files\\Google', sizeGB: 14.5, weight: 19 },
      { id: 'pf-git', name: 'Git & SDKs', path: 'C:\\Program Files\\Git', sizeGB: 8.1, weight: 11 },
      { id: 'pf-sent', name: 'Sentinel', path: 'C:\\Program Files\\Sentinel', sizeGB: 5.4, weight: 7 },
    ],
  },
  {
    id: 'program-data',
    name: 'ProgramData',
    path: 'C:\\ProgramData',
    sizeGB: 56.2,
    bg: '#DF489B',
    hoverBg: '#EC5AA9',
    accent: '#F9A8D4',
    children: [
      { id: 'pd-nvidia', name: 'NVIDIA Corp/Cache', path: 'C:\\ProgramData\\NVIDIA Corporation', sizeGB: 29.4, weight: 52 },
      { id: 'pd-pkg', name: 'Package Cache', path: 'C:\\ProgramData\\Package Cache', sizeGB: 14.8, weight: 26 },
      { id: 'pd-ms', name: 'Microsoft', path: 'C:\\ProgramData\\Microsoft', sizeGB: 12.0, weight: 22 },
    ],
  },
  {
    id: 'program-files-x86',
    name: 'Program Files (x86)',
    path: 'C:\\Program Files (x86)',
    sizeGB: 41.8,
    bg: '#D58417',
    hoverBg: '#E69324',
    accent: '#FDE68A',
    children: [
      { id: 'x86-steam', name: 'Steam Library', path: 'C:\\Program Files (x86)\\Steam', sizeGB: 19.6, weight: 47 },
      { id: 'x86-ms', name: 'Microsoft Shared', path: 'C:\\Program Files (x86)\\Microsoft', sizeGB: 12.8, weight: 31 },
      { id: 'x86-common', name: 'Common Files', path: 'C:\\Program Files (x86)\\Common Files', sizeGB: 9.4, weight: 22 },
    ],
  },
  {
    id: 'windows',
    name: 'Windows',
    path: 'C:\\Windows',
    sizeGB: 31.0,
    bg: '#11B27E',
    hoverBg: '#19C58D',
    accent: '#A7F3D0',
    children: [
      { id: 'win-sxs', name: 'WinSxS', path: 'C:\\Windows\\WinSxS', sizeGB: 14.2, weight: 46 },
      { id: 'win-sys', name: 'System32', path: 'C:\\Windows\\System32', sizeGB: 10.6, weight: 34 },
      { id: 'win-cont', name: 'Containers & Boot', path: 'C:\\Windows\\Containers', sizeGB: 6.2, weight: 20 },
    ],
  },
];

function formatSize(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(0)} MB`;
}

export const ScanScreen: React.FC<ScanScreenProps> = ({
  storageData,
  onCleanItems,
  onDeleteLargeFile,
}) => {
  const [subTab, setSubTab] = useState<'clean' | 'large' | 'cache'>('clean');
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [clearedIds, setClearedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(['temp', 'cache']);
  const [expandedId, setExpandedId] = useState<string | null>('temp');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{ name: string; path: string; sizeGB: number } | null>(null);
  const [riskFilter, setRiskFilter] = useState<'all' | 'safe' | 'caution'>('all');

  const cleanableItems: CleanableCategoryDetail[] = useMemo(() => {
    const fallbackCategories: CleanableCategoryDetail[] = [
      {
        id: 'temp',
        name: 'User Temp & Crash Dumps',
        description: 'Windows temporary artifacts & minidump logs',
        targetPath: 'C:\\Users\\Admin\\AppData\\Local\\Temp',
        reason: 'Safe to purge: Unreferenced .tmp & crash dump files inside OS Temp directory.',
        sizeMB: storageData.tempFilesMB,
        fileCount: 38,
        risk: 'safe',
        sampleFiles: [
          { name: 'WER-CrashDump-8821.dmp', path: 'C:\\Users\\Admin\\AppData\\Local\\Temp\\WER-CrashDump-8821.dmp', sizeMB: 1200 },
          { name: 'vscode-typescript-cache.tmp', path: 'C:\\Users\\Admin\\AppData\\Local\\Temp\\vscode-typescript-cache.tmp', sizeMB: 890 },
          { name: 'aria-debug-14902.log', path: 'C:\\Users\\Admin\\AppData\\Local\\Temp\\aria-debug-14902.log', sizeMB: 412 },
        ],
      },
      {
        id: 'cache',
        name: 'Browser & DirectX Shader Cache',
        description: 'Chromium HTTP cache & compiled GPU shaders',
        targetPath: 'C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache',
        reason: 'Safe to purge: Automatically rebuilt by Chrome and DirectX on next launch.',
        sizeMB: storageData.cacheMB,
        fileCount: 142,
        risk: 'safe',
        sampleFiles: [
          { name: 'f_000a8c_data_block', path: 'C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache\\f_000a8c', sizeMB: 940 },
          { name: 'NV_Cache_DX12_Shaders.bin', path: 'C:\\Users\\Admin\\AppData\\Local\\Temp\\NVIDIA Corporation\\NV_Cache\\DX12.bin', sizeMB: 820 },
          { name: 'Code Cache_js_bundle.bin', path: 'C:\\Users\\Admin\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Code Cache\\index.bin', sizeMB: 580 },
        ],
      },
      {
        id: 'duplicates',
        name: 'Duplicate Build Snapshots',
        description: 'Redundant identical archives (SHA-256 verified)',
        targetPath: 'C:\\Users\\Admin\\AppData\\Local\\Package Cache',
        reason: 'Safe to purge: Older duplicate MSI/NuGet package caches already installed.',
        sizeMB: storageData.duplicateFilesMB,
        fileCount: 14,
        risk: 'safe',
        sampleFiles: [
          { name: 'vcredist_x64_dup_copy.msi', path: 'C:\\Users\\Admin\\AppData\\Local\\Package Cache\\vcredist_x64.msi', sizeMB: 1120 },
          { name: 'node_v22_installer_cache.msi', path: 'C:\\Users\\Admin\\AppData\\Local\\Package Cache\\node_v22.msi', sizeMB: 860 },
        ],
      },
      {
        id: 'downloads',
        name: 'Downloads Setup Installers',
        description: 'Archived .iso & setup.exe bundles in Downloads',
        targetPath: 'C:\\Users\\Admin\\Downloads',
        reason: 'Caution: Review before deleting in case you still need offline setup installers.',
        sizeMB: 1980,
        fileCount: 6,
        risk: 'caution',
        sampleFiles: [
          { name: 'Win11_SDK_Setup_x64.iso', path: 'C:\\Users\\Admin\\Downloads\\Win11_SDK_Setup_x64.iso', sizeMB: 1340 },
          { name: 'GeForce_Experience_Setup.exe', path: 'C:\\Users\\Admin\\Downloads\\GeForce_Experience_Setup.exe', sizeMB: 640 },
        ],
      },
    ];

    const source = storageData.cleanableCategories || fallbackCategories;
    return source
      .map((item) => ({
        ...item,
        sizeMB: clearedIds.includes(item.id) ? 0 : item.sizeMB,
      }))
      .filter((item) => item.sizeMB > 0);
  }, [storageData, clearedIds]);

  const totalCleanableMB = useMemo(
    () => cleanableItems.reduce((acc, item) => acc + item.sizeMB, 0),
    [cleanableItems]
  );

  const selectedCleanableMB = useMemo(
    () =>
      cleanableItems
        .filter((item) => selectedIds.includes(item.id))
        .reduce((acc, item) => acc + item.sizeMB, 0),
    [cleanableItems, selectedIds]
  );

  const usedPercent = Math.min(100, Math.max(0, (storageData.usedSpaceGB / storageData.totalSpaceGB) * 100));
  const canFreePercent = ((totalCleanableMB / 1024) / storageData.totalSpaceGB) * 100;

  const activeGroup = useMemo(
    () => TREEMAP_GROUPS.find((g) => g.id === activeGroupId) || null,
    [activeGroupId]
  );

  const topUsageRankings = useMemo(() => {
    const scale = storageData.usedSpaceGB / 342;
    return [
      { rank: 1, name: 'Users', path: 'C:\\Users', sizeGB: +(138.4 * scale).toFixed(2), groupId: 'users' },
      { rank: 2, name: 'Program Files', path: 'C:\\Program Files', sizeGB: +(74.6 * scale).toFixed(2), groupId: 'program-files' },
      { rank: 3, name: 'ProgramData', path: 'C:\\ProgramData', sizeGB: +(56.2 * scale).toFixed(2), groupId: 'program-data' },
      { rank: 4, name: 'Admin/Documents', path: 'C:\\Users\\Admin\\Documents', sizeGB: +(54.2 * scale).toFixed(2), groupId: 'users' },
    ];
  }, [storageData.usedSpaceGB]);

  const toggleItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectSafe = () => {
    setSelectedIds(cleanableItems.filter((item) => item.risk === 'safe').map((item) => item.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handlePrimaryAction = () => {
    if (selectedCleanableMB > 0) {
      setIsCleaning(true);
      const freed = selectedCleanableMB;
      const toClear = cleanableItems.filter((i) => selectedIds.includes(i.id)).map((i) => i.id);
      setTimeout(() => {
        setIsCleaning(false);
        setClearedIds((prev) => [...prev, ...toClear]);
        setSelectedIds([]);
        onCleanItems(freed, toClear);
        setLastFeedback(`Reclaimed ${formatSize(freed)} across ${toClear.length} categories.`);
      }, 900);
    } else {
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
        setLastFeedback('Deep storage index refreshed. Drive health nominal.');
      }, 850);
    }
  };

  const filteredLargeFiles = useMemo(() => {
    if (riskFilter === 'all') return storageData.largeFiles;
    return storageData.largeFiles.filter((f) => f.risk === riskFilter);
  }, [storageData.largeFiles, riskFilter]);

  return (
    <div className="flex flex-col h-full bg-[#0D0F12] text-[#E6EDF3]">
      {/* Top Utility Header Bar (CleanC Style) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F242C] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#113126] border border-[#1D5442] flex items-center justify-center text-[#19C986]">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-white leading-tight">
              Storage Analyzer
            </h2>
            <p className="text-xs text-[#7D8794]">
              Local NVMe Volume · C:\ Drive
            </p>
          </div>
        </div>

        {/* Clean Segmented Tabs */}
        <div className="flex items-center gap-1.5 bg-[#15181E] border border-[#232933] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab('clean')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              subTab === 'clean'
                ? 'bg-[#17C983] text-[#051B12] font-semibold'
                : 'text-[#9CA5B4] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Clean
          </button>
          <button
            type="button"
            onClick={() => setSubTab('large')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              subTab === 'large'
                ? 'bg-[#17C983] text-[#051B12] font-semibold'
                : 'text-[#9CA5B4] hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Large Files ({storageData.largeFiles.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('cache')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              subTab === 'cache'
                ? 'bg-[#17C983] text-[#051B12] font-semibold'
                : 'text-[#9CA5B4] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Cache & Path Audit
          </button>
        </div>
      </div>

      {/* Main Asymmetric 2-Column Workspace */}
      <div className="flex-1 overflow-y-auto utility-scroll p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1260px] mx-auto">
          {/* LEFT COLUMN (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* 1. C: Drive Space Card */}
            <div className="bg-[#15181E] border border-[#242933] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1B2028] border border-[#2B323E] flex items-center justify-center text-[#9CA5B4]">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">C: Drive Space</h3>
                    <p className="text-xs text-[#7D8794]">Local Disk · NTFS · Health Nominal</p>
                  </div>
                </div>
                {lastFeedback && (
                  <div className="flex items-center gap-2 text-xs text-[#19C986]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{lastFeedback}</span>
                  </div>
                )}
              </div>

              {/* 4-Metric Row (CleanC Signature) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center mb-4">
                <div>
                  <div className="text-[11px] font-medium text-[#7D8794] tracking-wide mb-1">Total</div>
                  <div className="text-xl font-bold text-white utility-mono">
                    {storageData.totalSpaceGB.toFixed(0)} GB
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#7D8794] tracking-wide mb-1">Used</div>
                  <div className="text-xl font-bold text-[#F59E0B] utility-mono">
                    {storageData.usedSpaceGB.toFixed(2)} GB
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-[#7D8794] tracking-wide mb-1">Free</div>
                  <div className="text-xl font-bold text-[#19C986] utility-mono">
                    {storageData.freeSpaceGB.toFixed(2)} GB
                  </div>
                </div>
                <div className="bg-[#0F2620] border border-[#1B4A3C] rounded-xl px-4 py-2.5">
                  <div className="text-[11px] font-medium text-[#7EB8A4] tracking-wide mb-0.5">Cleanable</div>
                  <div className="text-lg font-bold text-[#19C986] utility-mono">
                    {formatSize(totalCleanableMB)}
                  </div>
                </div>
              </div>

              {/* Horizontal Capacity Bar */}
              <div className="w-full h-2 bg-[#232933] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#17C983] via-[#17C983] to-[#F59E0B] transition-all duration-500"
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs utility-mono">
                <span className="text-[#8B949E]">{usedPercent.toFixed(1)}% used</span>
                <span className="text-[#19C986]">
                  Can free {canFreePercent.toFixed(2)}% ({formatSize(totalCleanableMB)})
                </span>
              </div>
            </div>

            {/* 2. Bottom Main Panel switches cleanly by Sub-Tab */}
            {subTab === 'clean' && (
              <div className="bg-[#15181E] border border-[#242933] rounded-2xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-white">Space Distribution</h3>
                    <span className="text-xs text-[#7D8794]">
                      {activeGroup ? `Inspecting ${activeGroup.path}` : '5 root directories · Click to inspect'}
                    </span>
                  </div>
                  <div className="text-xs utility-mono text-[#19C986]">
                    {hoveredItem
                      ? `${hoveredItem.path} · ${hoveredItem.sizeGB.toFixed(1)} GB`
                      : activeGroup
                      ? `${activeGroup.sizeGB.toFixed(1)} GB`
                      : `${storageData.usedSpaceGB.toFixed(1)} GB mapped`}
                  </div>
                </div>

                {/* Interactive Treemap Visualization */}
                {!activeGroup ? (
                  <div className="grid grid-cols-12 gap-1.5 h-[330px] bg-[#0B0D11] p-2 rounded-xl border border-[#20252E]">
                    {/* Users Block (Cobalt Blue - 5 cols) */}
                    <div className="col-span-5 flex flex-col bg-[#141A24] rounded-lg overflow-hidden border border-[#253145] p-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveGroupId('users')}
                        className="text-left text-[11px] font-semibold text-white/95 px-1 pb-1 hover:text-[#93C5FD] flex items-center justify-between"
                      >
                        <span>Users</span>
                        <span className="utility-mono text-[10px] text-white/60">138.4 GB</span>
                      </button>
                      <div className="flex-1 grid grid-cols-2 gap-1">
                        {TREEMAP_GROUPS[0].children.map((child, idx) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => setActiveGroupId('users')}
                            onMouseEnter={() => setHoveredItem(child)}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={`rounded p-2 text-left flex flex-col justify-between transition-all hover:brightness-110 cursor-pointer ${
                              idx === 0 ? 'row-span-2' : ''
                            }`}
                            style={{ backgroundColor: TREEMAP_GROUPS[0].bg }}
                          >
                            <span className="text-[11px] font-semibold text-white leading-tight truncate w-full">
                              {child.name}
                            </span>
                            <span className="text-[10px] utility-mono text-white/80">
                              {child.sizeGB} GB
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Middle Column (Program Files Violet + x86 Amber - 4 cols) */}
                    <div className="col-span-4 flex flex-col gap-1.5">
                      {/* Program Files */}
                      <div className="flex-[1.35] flex flex-col bg-[#1A1626] rounded-lg overflow-hidden border border-[#32284A] p-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveGroupId('program-files')}
                          className="text-left text-[11px] font-semibold text-white/95 px-1 pb-1 hover:text-[#C4B5FD] flex items-center justify-between"
                        >
                          <span>Program Files</span>
                          <span className="utility-mono text-[10px] text-white/60">74.6 GB</span>
                        </button>
                        <div className="flex-1 grid grid-cols-3 gap-1">
                          {TREEMAP_GROUPS[1].children.map((child, idx) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => setActiveGroupId('program-files')}
                              onMouseEnter={() => setHoveredItem(child)}
                              onMouseLeave={() => setHoveredItem(null)}
                              className={`rounded p-1.5 text-left flex flex-col justify-between transition-all hover:brightness-110 cursor-pointer ${
                                idx === 0 ? 'col-span-2' : ''
                              }`}
                              style={{ backgroundColor: idx % 2 === 0 ? '#7C56F3' : '#6A46DF' }}
                            >
                              <span className="text-[10px] font-semibold text-white truncate w-full">
                                {child.name}
                              </span>
                              <span className="text-[9px] utility-mono text-white/75">
                                {child.sizeGB}G
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Program Files (x86) */}
                      <div className="flex-1 flex flex-col bg-[#221A10] rounded-lg overflow-hidden border border-[#42321C] p-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveGroupId('program-files-x86')}
                          className="text-left text-[11px] font-semibold text-white/95 px-1 pb-1 hover:text-[#FDE68A] flex items-center justify-between"
                        >
                          <span className="truncate">Program Files (x86)</span>
                          <span className="utility-mono text-[10px] text-white/60">41.8 GB</span>
                        </button>
                        <div className="flex-1 grid grid-cols-3 gap-1">
                          {TREEMAP_GROUPS[3].children.map((child, idx) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => setActiveGroupId('program-files-x86')}
                              onMouseEnter={() => setHoveredItem(child)}
                              onMouseLeave={() => setHoveredItem(null)}
                              className="rounded p-1.5 text-left flex flex-col justify-between transition-all hover:brightness-110 cursor-pointer"
                              style={{ backgroundColor: idx === 0 ? '#D98517' : idx === 1 ? '#B86E10' : '#9B5A0C' }}
                            >
                              <span className="text-[10px] font-semibold text-white truncate w-full">
                                {child.name}
                              </span>
                              <span className="text-[9px] utility-mono text-white/80">
                                {child.sizeGB}G
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column (ProgramData Rose + Windows Emerald - 3 cols) */}
                    <div className="col-span-3 flex flex-col gap-1.5">
                      {/* ProgramData */}
                      <div className="flex-[1.35] flex flex-col bg-[#24131E] rounded-lg overflow-hidden border border-[#462238] p-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveGroupId('program-data')}
                          className="text-left text-[11px] font-semibold text-white/95 px-1 pb-1 hover:text-[#F9A8D4] flex items-center justify-between"
                        >
                          <span>ProgramData</span>
                          <span className="utility-mono text-[10px] text-white/60">56.2G</span>
                        </button>
                        <div className="flex-1 grid grid-cols-2 gap-1">
                          {TREEMAP_GROUPS[2].children.map((child, idx) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => setActiveGroupId('program-data')}
                              onMouseEnter={() => setHoveredItem(child)}
                              onMouseLeave={() => setHoveredItem(null)}
                              className={`rounded p-1.5 text-left flex flex-col justify-between transition-all hover:brightness-110 cursor-pointer ${
                                idx === 0 ? 'col-span-2' : ''
                              }`}
                              style={{ backgroundColor: idx === 0 ? '#DF489B' : '#C23582' }}
                            >
                              <span className="text-[10px] font-semibold text-white truncate w-full">
                                {child.name}
                              </span>
                              <span className="text-[9px] utility-mono text-white/80">
                                {child.sizeGB}G
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Windows */}
                      <div className="flex-1 flex flex-col bg-[#0F211B] rounded-lg overflow-hidden border border-[#1E4337] p-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveGroupId('windows')}
                          className="text-left text-[11px] font-semibold text-white/95 px-1 pb-1 hover:text-[#A7F3D0] flex items-center justify-between"
                        >
                          <span>Windows</span>
                          <span className="utility-mono text-[10px] text-white/60">31.0G</span>
                        </button>
                        <div className="flex-1 grid grid-cols-2 gap-1">
                          {TREEMAP_GROUPS[4].children.map((child, idx) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => setActiveGroupId('windows')}
                              onMouseEnter={() => setHoveredItem(child)}
                              onMouseLeave={() => setHoveredItem(null)}
                              className={`rounded p-1.5 text-left flex flex-col justify-between transition-all hover:brightness-110 cursor-pointer ${
                                idx === 0 ? 'col-span-2' : ''
                              }`}
                              style={{ backgroundColor: idx === 0 ? '#11B27E' : '#0D8E64' }}
                            >
                              <span className="text-[10px] font-semibold text-white truncate w-full">
                                {child.name}
                              </span>
                              <span className="text-[9px] utility-mono text-white/80">
                                {child.sizeGB}G
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Drilled-in Category Breakdown */
                  <div className="h-[330px] bg-[#0B0D11] p-3 rounded-xl border border-[#20252E] flex flex-col gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      {activeGroup.children.map((child, idx) => (
                        <div
                          key={child.id}
                          onMouseEnter={() => setHoveredItem(child)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className="rounded-lg p-4 flex flex-col justify-between transition-all hover:brightness-110"
                          style={{
                            backgroundColor: activeGroup.bg,
                            opacity: 1 - idx * 0.08,
                          }}
                        >
                          <div>
                            <div className="text-sm font-semibold text-white">{child.name}</div>
                            <div className="text-[11px] utility-mono text-white/75 mt-1 break-all">
                              {child.path}
                            </div>
                          </div>
                          <div className="flex items-end justify-between">
                            <span className="text-xs text-white/80">{child.weight}% of {activeGroup.name}</span>
                            <span className="text-lg font-bold utility-mono text-white">{child.sizeGB} GB</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Treemap Breadcrumb Bar */}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#8B949E]">
                    <button
                      type="button"
                      onClick={() => setActiveGroupId(null)}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                        !activeGroup ? 'bg-[#202631] text-white font-medium' : 'hover:text-white'
                      }`}
                    >
                      C:\ Local Disk
                    </button>
                    {activeGroup && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-[#566070]" />
                        <span className="px-2 py-1 rounded-md bg-[#202631] text-white font-medium">
                          {activeGroup.name} ({activeGroup.path})
                        </span>
                      </>
                    )}
                    {hoveredItem && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-[#566070]" />
                        <span className="text-[#9CA5B4] utility-mono">{hoveredItem.path}</span>
                      </>
                    )}
                  </div>
                  {activeGroup && (
                    <button
                      type="button"
                      onClick={() => setActiveGroupId(null)}
                      className="text-xs text-[#19C986] hover:underline cursor-pointer"
                    >
                      Back to All Volumes
                    </button>
                  )}
                </div>
              </div>
            )}

            {subTab === 'large' && (
              <div className="bg-[#15181E] border border-[#242933] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Large & Orphaned Files</h3>
                    <p className="text-xs text-[#7D8794] mt-0.5">
                      Full file path and deletion safety classification on C:\ volume
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#0E1116] p-1 rounded-lg border border-[#232933]">
                    {(['all', 'safe', 'caution'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setRiskFilter(level)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                          riskFilter === level
                            ? 'bg-[#232A36] text-white'
                            : 'text-[#8B949E] hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredLargeFiles.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-[#272D38] rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-[#19C986] mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">No large files match this filter</p>
                    <p className="text-xs text-[#7D8794] mt-1">Your volume is clean of oversized orphaned archives.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#202630] border border-[#232933] rounded-xl overflow-hidden bg-[#101318]">
                    {filteredLargeFiles.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-start justify-between px-4 py-3.5 hover:bg-[#171B22] transition-colors gap-4"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#1A2029] border border-[#28303E] flex items-center justify-center shrink-0 text-[#9CA5B4] mt-0.5">
                            <FileArchive className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white">{file.name}</div>
                            <div className="text-xs utility-mono text-[#94A3B8] break-all mt-0.5">
                              Path: {file.path}
                            </div>
                            <div className="text-[11px] text-[#7D8794] mt-1">
                              {file.risk === 'safe'
                                ? 'Reason: Temporary crash dump or old setup image — safe to delete without affecting installed apps.'
                                : 'Reason: User backup archive — verify you have another copy before removing.'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-semibold utility-mono text-[#F59E0B]">
                              {formatSize(file.sizeMB)}
                            </div>
                            <div
                              className={`text-[11px] flex items-center justify-end gap-1 ${
                                file.risk === 'safe' ? 'text-[#19C986]' : 'text-[#F59E0B]'
                              }`}
                            >
                              {file.risk === 'safe' ? (
                                <ShieldCheck className="w-3 h-3" />
                              ) : (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              <span>{file.risk === 'safe' ? 'Safe to remove' : 'Review first'}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onDeleteLargeFile(file.name, file.sizeMB);
                              setLastFeedback(`Removed ${file.name} (${formatSize(file.sizeMB)}).`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#23191D] border border-[#4A252D] text-[#F87171] hover:bg-[#331F25] text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {subTab === 'cache' && (
              <div className="bg-[#15181E] border border-[#242933] rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    Full Directory Path & File Audit
                  </h3>
                  <p className="text-xs text-[#7D8794]">
                    Exact filesystem locations and detected files inside each cleanable category
                  </p>
                </div>

                <div className="space-y-3">
                  {cleanableItems.map((cat) => (
                    <div
                      key={cat.id}
                      className="bg-[#101318] border border-[#232933] rounded-xl p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-white">
                          {cat.name} ({cat.fileCount} files)
                        </div>
                        <span className="text-xs font-bold utility-mono text-[#19C986]">
                          {formatSize(cat.sizeMB)}
                        </span>
                      </div>
                      <div className="text-[11px] utility-mono text-[#38BDF8] bg-[#161B24] border border-[#242C3A] rounded-lg px-2.5 py-1.5 break-all">
                        Directory: {cat.targetPath}
                      </div>
                      <div className="text-[11px] text-[#9CA5B4]">{cat.reason}</div>
                      <div className="space-y-1.5 pt-1">
                        {cat.sampleFiles.map((f) => (
                          <div
                            key={f.path}
                            className="flex items-center justify-between text-[11px] bg-[#141820] px-2.5 py-1.5 rounded border border-[#1F2531] gap-2"
                          >
                            <span className="utility-mono text-[#CBD5E1] break-all">{f.path}</span>
                            <span className="utility-mono text-[#F59E0B] shrink-0">
                              {formatSize(f.sizeMB)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (5 cols - Expanded for Clear Paths & Sample File Inspection) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* 1. Full-Width Emerald Action Button (CleanC Signature) */}
            <button
              type="button"
              disabled={isScanning || isCleaning}
              onClick={handlePrimaryAction}
              className="w-full py-3.5 px-5 rounded-xl bg-[#17C983] hover:bg-[#1FD890] active:scale-[0.99] text-[#051B12] font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
            >
              {isCleaning || isScanning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : selectedCleanableMB > 0 ? (
                <Trash2 className="w-4 h-4" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>
                {isCleaning
                  ? 'Purging Selected Paths...'
                  : isScanning
                  ? 'Scanning Volume Sectors...'
                  : selectedCleanableMB > 0
                  ? `Clean Selected (${formatSize(selectedCleanableMB)})`
                  : 'Start Deep Scan'}
              </span>
            </button>

            {/* 2. Cleanable Items Checklist Card with Exact Target Paths & Expandable File Previews */}
            <div className="bg-[#15181E] border border-[#242933] rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Cleanable Items & Paths</h3>
                  <p className="text-[11px] text-[#7D8794]">
                    Click an item to toggle selection · Click "Files" to view exact paths
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectSafe}
                    className="px-2.5 py-1 rounded-md bg-[#1D222B] hover:bg-[#272E3B] text-[11px] font-medium text-[#CBD5E1] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Select Safe
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 rounded-md bg-[#1D222B] hover:bg-[#272E3B] text-[11px] font-medium text-[#8B949E] hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {cleanableItems.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-7 h-7 text-[#19C986] mx-auto mb-2" />
                  <p className="text-xs font-medium text-white">All cleanable items purged</p>
                  <p className="text-[11px] text-[#7D8794] mt-1">Run a deep scan anytime to re-check.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cleanableItems.map((item) => {
                    const checked = selectedIds.includes(item.id);
                    const isCaution = item.risk === 'caution';
                    const isExpanded = expandedId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border transition-all overflow-hidden ${
                          checked
                            ? isCaution
                              ? 'bg-[#21171A] border-[#5B2C34]'
                              : 'bg-[#12221E] border-[#1F5644]'
                            : 'bg-[#101318] border-[#212630]'
                        }`}
                      >
                        <div className="p-3 flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => toggleItem(item.id)}
                            className="flex items-start gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <div
                              className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                                checked
                                  ? 'bg-[#17C983] border-[#17C983] text-[#051B12]'
                                  : 'border-[#444E5E] bg-transparent'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <Folder className="w-4 h-4 text-[#8B949E] shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-white">
                                {item.name}{' '}
                                <span className="text-[11px] font-normal text-[#8B949E]">
                                  ({item.fileCount} files)
                                </span>
                              </div>
                              {/* Full Directory Path Shown Explicitly */}
                              <div className="text-[11px] utility-mono text-[#94A3B8] break-all mt-0.5">
                                {item.targetPath}
                              </div>
                              <div className="text-[11px] text-[#7D8794] mt-0.5">
                                {item.reason}
                              </div>
                            </div>
                          </button>

                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <div className="text-xs font-semibold utility-mono text-[#19C986]">
                              {formatSize(item.sizeMB)}
                            </div>
                            <div
                              className={`text-[10px] font-medium ${
                                isCaution ? 'text-[#F87171]' : 'text-[#6EE7B7]'
                              }`}
                            >
                              {isCaution ? 'Caution' : 'Safe'}
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : item.id)}
                              className="text-[10px] text-[#38BDF8] hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer"
                            >
                              <span>Files</span>
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Expandable List of Specific Files Inside This Folder */}
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1.5 border-t border-white/5 bg-black/25 space-y-1.5">
                            <div className="text-[10px] font-medium text-[#8B949E]">
                              Detected files to be deleted in this folder:
                            </div>
                            {item.sampleFiles.map((file) => (
                              <div
                                key={file.path}
                                className="flex items-start justify-between gap-2 text-[11px] bg-[#0D1015] border border-[#1E242F] rounded-lg px-2.5 py-1.5"
                              >
                                <div className="flex items-start gap-1.5 min-w-0">
                                  <FileText className="w-3.5 h-3.5 text-[#7D8794] shrink-0 mt-0.5" />
                                  <div className="min-w-0">
                                    <div className="text-white font-medium truncate">
                                      {file.name}
                                    </div>
                                    <div className="text-[10px] utility-mono text-[#7D8794] break-all">
                                      {file.path}
                                    </div>
                                  </div>
                                </div>
                                <span className="utility-mono text-[#F59E0B] shrink-0">
                                  {formatSize(file.sizeMB)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. TOP Usage Ranking Card (CleanC Signature) */}
            <div className="bg-[#15181E] border border-[#242933] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-sm font-semibold text-white">Top Usage Ranking</h3>
                <span className="text-[11px] text-[#7D8794]">Click to inspect</span>
              </div>
              <div className="space-y-2.5">
                {topUsageRankings.map((item) => {
                  const badgeStyle =
                    item.rank === 1
                      ? 'bg-[#F5B731] text-[#1A1303]'
                      : item.rank === 2
                      ? 'bg-[#9AA3B2] text-[#111419]'
                      : item.rank === 3
                      ? 'bg-[#D97736] text-[#1C0D03]'
                      : 'bg-[#262D38] text-[#CBD5E1]';
                  return (
                    <button
                      key={item.rank}
                      type="button"
                      onClick={() => {
                        setSubTab('clean');
                        setActiveGroupId(item.groupId);
                      }}
                      className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[#1B2029] transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-md text-xs font-bold utility-mono flex items-center justify-center shrink-0 ${badgeStyle}`}
                        >
                          {item.rank}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                          <div className="text-[11px] utility-mono text-[#7D8794] truncate">{item.path}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold utility-mono text-[#F59E0B] shrink-0">
                        {item.sizeGB} GB
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
  );
};
