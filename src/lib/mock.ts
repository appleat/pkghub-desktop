import type {
  Activity,
  Category,
  CategoryInput,
  Dashboard,
  PackageQuery,
  Pkg,
  ScanDir,
  ScanProgress,
  ScanSettings,
} from "./types";

const MB = 1024 * 1024;

interface Seed {
  name: string;
  version: string;
  cat: number;
  fmt: string;
  mb: number;
  arch?: string;
  days: number;
  installable?: boolean;
}

const CAT_DEFS: Array<[string, string, string, string]> = [
  ["开发工具", "#6366f1", "code", "vscode,git,node,python,jdk,docker,idea,mysql,postman,navicat,redis"],
  ["办公效率", "#0ea5e9", "briefcase", "office,wps,acrobat,pdf,notion,obsidian,xmind,typora"],
  ["图形设计", "#ec4899", "palette", "photoshop,illustrator,figma,blender,autocad,sketchup,字体"],
  ["影音媒体", "#f59e0b", "play", "vlc,potplayer,obs,premiere,剪映,audacity"],
  ["系统工具", "#10b981", "wrench", "7-zip,winrar,everything,驱动,directx,terminal"],
  ["安全防护", "#ef4444", "shield", "火绒,360,杀毒,kaspersky,安全卫士"],
  ["网络浏览", "#3b82f6", "globe", "chrome,firefox,edge,浏览器"],
  ["通讯协作", "#8b5cf6", "chat", "wechat,微信,qq,钉钉,飞书,腾讯会议"],
  ["游戏娱乐", "#f97316", "game", "steam,epic,unity,wegame,游戏"],
  ["其他", "#64748b", "box", ""],
];

const SEEDS: Seed[] = [
  { name: "Visual Studio Code", version: "1.85.1", cat: 1, fmt: "EXE", mb: 96, arch: "x64", days: 12 },
  { name: "Node.js LTS", version: "20.11.0", cat: 1, fmt: "MSI", mb: 30, arch: "x64", days: 25 },
  { name: "Python", version: "3.12.2", cat: 1, fmt: "EXE", mb: 26, arch: "x64", days: 33 },
  { name: "Git for Windows", version: "2.43.0", cat: 1, fmt: "EXE", mb: 58, arch: "x64", days: 40 },
  { name: "Docker Desktop", version: "4.27.2", cat: 1, fmt: "EXE", mb: 560, arch: "x64", days: 8 },
  { name: "OpenJDK", version: "17.0.10", cat: 1, fmt: "ZIP", mb: 190, arch: "x64", days: 55, installable: false },
  { name: "MySQL Community Server", version: "8.0.36", cat: 1, fmt: "MSI", mb: 350, arch: "x64", days: 61 },
  { name: "Postman", version: "10.23.5", cat: 1, fmt: "EXE", mb: 130, arch: "x64", days: 70 },
  { name: "Navicat Premium", version: "16.3.4", cat: 1, fmt: "EXE", mb: 120, arch: "x64", days: 88 },
  { name: "IntelliJ IDEA Ultimate", version: "2023.3.4", cat: 1, fmt: "EXE", mb: 890, arch: "x64", days: 95 },
  { name: "Rust Toolchain", version: "1.76.0", cat: 1, fmt: "MSI", mb: 240, arch: "x64", days: 110 },
  { name: "Redis for Windows", version: "7.2.4", cat: 1, fmt: "ZIP", mb: 12, arch: "x64", days: 120, installable: false },

  { name: "WPS Office", version: "12.1.0.16", cat: 2, fmt: "EXE", mb: 260, arch: "x64", days: 3 },
  { name: "Adobe Acrobat Reader", version: "2023.008", cat: 2, fmt: "EXE", mb: 210, arch: "x64", days: 15 },
  { name: "Notion", version: "3.12.0", cat: 2, fmt: "EXE", mb: 92, arch: "x64", days: 20 },
  { name: "Obsidian", version: "1.5.8", cat: 2, fmt: "EXE", mb: 78, arch: "x64", days: 45 },
  { name: "XMind", version: "2024", cat: 2, fmt: "EXE", mb: 180, arch: "x64", days: 52 },
  { name: "Typora", version: "1.8.5", cat: 2, fmt: "EXE", mb: 76, arch: "x64", days: 66 },
  { name: "Office 2021 镜像", version: "2021", cat: 2, fmt: "ISO", mb: 4200, days: 140, installable: false },

  { name: "Adobe Photoshop", version: "2024", cat: 3, fmt: "EXE", mb: 2400, arch: "x64", days: 5 },
  { name: "Adobe Illustrator", version: "2024", cat: 3, fmt: "EXE", mb: 1900, arch: "x64", days: 6 },
  { name: "Figma Desktop", version: "116.10", cat: 3, fmt: "EXE", mb: 88, arch: "x64", days: 30 },
  { name: "Blender", version: "4.0.2", cat: 3, fmt: "MSI", mb: 310, arch: "x64", days: 72 },
  { name: "AutoCAD", version: "2024", cat: 3, fmt: "EXE", mb: 2100, arch: "x64", days: 130 },
  { name: "SketchUp Pro", version: "2023", cat: 3, fmt: "EXE", mb: 620, arch: "x64", days: 142 },
  { name: "字体合集", version: "2024", cat: 3, fmt: "RAR", mb: 480, days: 160, installable: false },

  { name: "VLC Media Player", version: "3.0.20", cat: 4, fmt: "EXE", mb: 42, arch: "x64", days: 10 },
  { name: "PotPlayer", version: "1.7.22077", cat: 4, fmt: "EXE", mb: 32, arch: "x64", days: 18 },
  { name: "OBS Studio", version: "30.0.2", cat: 4, fmt: "EXE", mb: 145, arch: "x64", days: 35 },
  { name: "Adobe Premiere Pro", version: "2024", cat: 4, fmt: "EXE", mb: 2600, arch: "x64", days: 7 },
  { name: "剪映专业版", version: "5.9.0", cat: 4, fmt: "EXE", mb: 380, arch: "x64", days: 22 },
  { name: "Audacity", version: "3.4.2", cat: 4, fmt: "EXE", mb: 40, arch: "x64", days: 80 },

  { name: "7-Zip", version: "23.01", cat: 5, fmt: "EXE", mb: 2, arch: "x64", days: 2 },
  { name: "WinRAR", version: "6.24", cat: 5, fmt: "EXE", mb: 4, arch: "x64", days: 14 },
  { name: "Everything", version: "1.4.1", cat: 5, fmt: "EXE", mb: 2, arch: "x64", days: 28 },
  { name: "驱动精灵", version: "12.0", cat: 5, fmt: "EXE", mb: 88, arch: "x64", days: 48 },
  { name: "DirectX 修复工具", version: "4.2", cat: 5, fmt: "EXE", mb: 65, arch: "x64", days: 75 },
  { name: "Windows Terminal", version: "1.19", cat: 5, fmt: "MSIX", mb: 12, arch: "x64", days: 58 },
  { name: "便携工具箱", version: "2.1", cat: 5, fmt: "7Z", mb: 260, days: 96, installable: false },

  { name: "火绒安全", version: "6.0", cat: 6, fmt: "EXE", mb: 62, arch: "x64", days: 9 },
  { name: "360 安全卫士", version: "14.0", cat: 6, fmt: "EXE", mb: 180, arch: "x64", days: 60 },

  { name: "Google Chrome", version: "120.0.6099.130", cat: 7, fmt: "EXE", mb: 105, arch: "x64", days: 1 },
  { name: "Mozilla Firefox", version: "122.0", cat: 7, fmt: "EXE", mb: 62, arch: "x64", days: 26 },
  { name: "Microsoft Edge", version: "121.0", cat: 7, fmt: "EXE", mb: 150, arch: "x64", days: 44 },

  { name: "微信", version: "3.9.9.43", cat: 8, fmt: "EXE", mb: 240, arch: "x64", days: 4 },
  { name: "钉钉", version: "7.5.0", cat: 8, fmt: "EXE", mb: 320, arch: "x64", days: 11 },
  { name: "飞书", version: "6.9.8", cat: 8, fmt: "EXE", mb: 280, arch: "x64", days: 19 },
  { name: "腾讯会议", version: "3.18.1", cat: 8, fmt: "EXE", mb: 190, arch: "x64", days: 37 },

  { name: "Steam", version: "2024", cat: 9, fmt: "EXE", mb: 3, arch: "x64", days: 13 },
  { name: "Unity Hub", version: "3.6.2", cat: 9, fmt: "EXE", mb: 120, arch: "x64", days: 58 },
  { name: "Epic Games Launcher", version: "15.17", cat: 9, fmt: "MSI", mb: 68, arch: "x64", days: 90 },
];

function extOf(fmt: string): string {
  return fmt === "7Z" ? "7z" : fmt.toLowerCase();
}

function folderOf(fmt: string): string {
  return fmt === "MSI" || fmt === "MSIX" ? "System" : "Installers";
}

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400000);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

const categories: Category[] = CAT_DEFS.map(([name, color, icon, keywords], i) => ({
  id: i + 1,
  name,
  color,
  icon,
  keywords,
  builtin: true,
  sortOrder: i,
  packageCount: 0,
  totalSize: 0,
}));

let nextId = 1;

const packages: Pkg[] = SEEDS.map((s) => {
  const id = nextId++;
  const fileName = `${s.name.replace(/\s+/g, "_")}_${s.version}${s.arch ? "_" + s.arch : ""}.${extOf(s.fmt)}`;
  const cat = categories.find((c) => c.id === s.cat);
  return {
    id,
    name: s.name,
    fileName,
    path: `D:\\Software\\${folderOf(s.fmt)}\\${cat ? cat.name : "其他"}\\${fileName}`,
    version: s.version,
    categoryId: s.cat,
    categoryName: cat ? cat.name : null,
    categoryColor: cat ? cat.color : null,
    format: s.fmt,
    size: Math.round(s.mb * MB * (0.92 + ((id * 37) % 17) / 100)),
    arch: s.arch ?? null,
    installable: s.installable !== false,
    favorite: id % 11 === 0,
    notes: null,
    launchCount: id % 7,
    lastLaunchedAt: id % 7 === 0 ? daysAgo(3) : null,
    fileMtime: Math.floor(Date.now() / 1000) - s.days * 86400,
    addedAt: daysAgo(s.days),
  };
});

const scanDirs: ScanDir[] = [
  { id: 1, path: "D:\\Software\\Installers", enabled: true, lastScanAt: daysAgo(0), packageCount: 38 },
  { id: 2, path: "D:\\Software\\System", enabled: true, lastScanAt: daysAgo(1), packageCount: 12 },
  { id: 3, path: "E:\\Downloads\\安装包", enabled: false, lastScanAt: daysAgo(9), packageCount: 5 },
];

const activities: Activity[] = [
  { id: 1, kind: "scan", message: "扫描完成：新增 8 个，更新 46 个，清理 1 个失效条目", createdAt: daysAgo(0) },
  { id: 2, kind: "launch", message: "启动了 Google Chrome 的安装程序", createdAt: daysAgo(0) },
  { id: 3, kind: "category", message: "新建了分类「安全防护」", createdAt: daysAgo(1) },
  { id: 4, kind: "launch", message: "启动了 WPS Office 的安装程序", createdAt: daysAgo(2) },
  { id: 5, kind: "delete", message: "移除了 旧版 Node.js 14（文件已回收）", createdAt: daysAgo(3) },
  { id: 6, kind: "scan", message: "扫描完成：新增 12 个，更新 34 个，清理 0 个失效条目", createdAt: daysAgo(4) },
];

function recomputeCategories(): void {
  for (const c of categories) {
    const list = packages.filter((p) => p.categoryId === c.id);
    c.packageCount = list.length;
    c.totalSize = list.reduce((a, p) => a + p.size, 0);
  }
}

function sortList(list: Pkg[], sort?: string): Pkg[] {
  const copy = [...list];
  switch (sort) {
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    case "size":
      return copy.sort((a, b) => b.size - a.size);
    case "sizeAsc":
      return copy.sort((a, b) => a.size - b.size);
    case "mtime":
      return copy.sort((a, b) => b.fileMtime - a.fileMtime);
    case "format":
      return copy.sort((a, b) => a.format.localeCompare(b.format) || b.size - a.size);
    case "category":
      return copy.sort(
        (a, b) => (a.categoryName ?? "zz").localeCompare(b.categoryName ?? "zz", "zh-Hans-CN") || a.name.localeCompare(b.name),
      );
    default:
      return copy.sort((a, b) => b.id - a.id);
  }
}

function buildDashboard(): Dashboard {
  recomputeCategories();
  const totalSize = packages.reduce((a, p) => a + p.size, 0);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}`;

  const byCatMap = new Map<string, { name: string; color: string; count: number; size: number }>();
  for (const p of packages) {
    const key = p.categoryName ?? "未分类";
    const cur = byCatMap.get(key) ?? { name: key, color: p.categoryColor ?? "#94a3b8", count: 0, size: 0 };
    cur.count += 1;
    cur.size += p.size;
    byCatMap.set(key, cur);
  }
  const byFormatMap = new Map<string, { format: string; count: number; size: number }>();
  for (const p of packages) {
    const cur = byFormatMap.get(p.format) ?? { format: p.format, count: 0, size: 0 };
    cur.count += 1;
    cur.size += p.size;
    byFormatMap.set(p.format, cur);
  }

  const dupMap = new Map<string, number>();
  for (const p of packages) {
    const k = `${p.fileName}|${p.size}`;
    dupMap.set(k, (dupMap.get(k) ?? 0) + 1);
  }
  let duplicateCount = 0;
  dupMap.forEach((v) => {
    if (v > 1) duplicateCount += v - 1;
  });

  return {
    totalPackages: packages.length,
    totalSize,
    categoryCount: categories.length,
    formatCount: byFormatMap.size,
    addedThisMonth: packages.filter((p) => p.addedAt.startsWith(thisMonth)).length,
    addedLastMonth: packages.filter((p) => p.addedAt.startsWith(lastMonth)).length,
    installableCount: packages.filter((p) => p.installable).length,
    favoriteCount: packages.filter((p) => p.favorite).length,
    duplicateCount,
    scanDirCount: scanDirs.length,
    uncategorizedCount: packages.filter((p) => p.categoryId === null).length,
    byCategory: [...byCatMap.values()].sort((a, b) => b.size - a.size),
    byFormat: [...byFormatMap.values()].sort((a, b) => b.count - a.count || b.size - a.size),
    biggest: [...packages].sort((a, b) => b.size - a.size).slice(0, 5),
    recentPackages: [...packages].sort((a, b) => b.id - a.id).slice(0, 6),
    recentActivity: activities.slice(0, 8),
  };
}

/* ------------------------- 演示模式下的事件通道 ------------------------- */

const progressListeners = new Set<(p: ScanProgress) => void>();

const scanSettings: ScanSettings = { includeArchives: true, maxDepth: 8, skipFormats: [] };

export function mockOnScanProgress(cb: (p: ScanProgress) => void): () => void {
  progressListeners.add(cb);
  return () => progressListeners.delete(cb);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------ mock invoke ------------------------------ */

export async function mockInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const a = args ?? {};
  switch (cmd) {
    case "get_dashboard":
      return buildDashboard() as T;

    case "list_packages": {
      const q = (a.query ?? {}) as PackageQuery;
      let list = packages;
      if (q.search) {
        const s = q.search.toLowerCase();
        list = list.filter(
          (p) => p.name.toLowerCase().includes(s) || p.fileName.toLowerCase().includes(s) || p.path.toLowerCase().includes(s),
        );
      }
      if (q.categoryId) list = list.filter((p) => p.categoryId === q.categoryId);
      if (q.format && q.format !== "ALL") list = list.filter((p) => p.format === q.format);
      if (q.onlyFavorites) list = list.filter((p) => p.favorite);
      if (q.installableOnly) list = list.filter((p) => p.installable);
      return sortList(list, q.sort) as T;
    }

    case "list_categories":
      recomputeCategories();
      return [...categories] as T;

    case "list_scan_dirs":
      return scanDirs as T;

    case "list_activities":
      return activities as T;

    case "set_package_category": {
      const p = packages.find((x) => x.id === a.id);
      if (!p) throw new Error("找不到该安装包");
      const cid = (a.categoryId ?? null) as number | null;
      const cat = categories.find((c) => c.id === cid);
      p.categoryId = cid;
      p.categoryName = cat ? cat.name : null;
      p.categoryColor = cat ? cat.color : null;
      recomputeCategories();
      return { ...p } as T;
    }

    case "toggle_favorite": {
      const p = packages.find((x) => x.id === a.id);
      if (!p) throw new Error("找不到该安装包");
      p.favorite = !p.favorite;
      return p.favorite as T;
    }

    case "rename_package": {
      const p = packages.find((x) => x.id === a.id);
      if (!p) throw new Error("找不到该安装包");
      p.name = String(a.name ?? p.name);
      return { ...p } as T;
    }

    case "set_package_notes": {
      const p = packages.find((x) => x.id === a.id);
      if (p) p.notes = String(a.notes ?? "");
      return undefined as T;
    }

    case "launch_package":
      throw new Error("演示模式下无法启动安装程序，请在桌面端运行 PkgHub");

    case "reveal_package":
      throw new Error("演示模式下无法打开文件所在位置");

    case "delete_package": {
      const i = packages.findIndex((x) => x.id === a.id);
      if (i >= 0) packages.splice(i, 1);
      recomputeCategories();
      return undefined as T;
    }

    case "create_category": {
      const input = a.input as CategoryInput;
      if (categories.some((c) => c.name === input.name)) throw new Error("已存在同名分类");
      categories.push({
        id: Math.max(0, ...categories.map((c) => c.id)) + 1,
        name: input.name,
        color: input.color ?? "#64748b",
        icon: input.icon ?? "box",
        keywords: input.keywords ?? "",
        builtin: false,
        sortOrder: categories.length,
        packageCount: 0,
        totalSize: 0,
      });
      return [...categories] as T;
    }

    case "update_category": {
      const c = categories.find((x) => x.id === a.id);
      if (!c) throw new Error("找不到该分类");
      const input = a.input as CategoryInput;
      c.name = input.name;
      if (input.color) c.color = input.color;
      if (input.icon) c.icon = input.icon;
      if (input.keywords !== undefined) c.keywords = input.keywords;
      for (const p of packages) if (p.categoryId === c.id) p.categoryName = c.name;
      return [...categories] as T;
    }

    case "delete_category": {
      const i = categories.findIndex((c) => c.id === a.id);
      if (i >= 0) {
        for (const p of packages) {
          if (p.categoryId === categories[i].id) {
            p.categoryId = null;
            p.categoryName = null;
            p.categoryColor = null;
          }
        }
        categories.splice(i, 1);
      }
      recomputeCategories();
      return [...categories] as T;
    }

    case "reclassify_uncategorized":
      return 0 as T;

    case "add_scan_dir": {
      const path = String(a.path ?? "");
      if (!scanDirs.some((d) => d.path === path)) {
        scanDirs.push({ id: scanDirs.length + 1, path, enabled: true, lastScanAt: null, packageCount: 0 });
      }
      return [...scanDirs] as T;
    }

    case "remove_scan_dir":
      return scanDirs.filter((d) => d.id !== a.id) as T;

    case "toggle_scan_dir": {
      const d = scanDirs.find((x) => x.id === a.id);
      if (d) d.enabled = Boolean(a.enabled);
      return [...scanDirs] as T;
    }

    case "pick_folder":
      return null as T;

    case "open_folder":
      return undefined as T;

    case "get_scan_settings":
      return { ...scanSettings } as T;

    case "set_scan_settings": {
      const incoming = a.settings as ScanSettings;
      scanSettings.includeArchives = incoming.includeArchives;
      scanSettings.maxDepth = incoming.maxDepth;
      scanSettings.skipFormats = [...incoming.skipFormats];
      return undefined as T;
    }

    case "scan_directories":
    case "rescan_all": {
      const total = 180;
      for (let i = 1; i <= 12; i++) {
        await delay(120);
        const scanned = Math.round((total / 12) * i);
        progressListeners.forEach((cb) =>
          cb({
            root: scanDirs[0]?.path ?? "D:\\Software",
            scanned,
            found: Math.round(scanned * 0.32),
            current: `D:\\Software\\Installers\\sample_${scanned}.exe`,
          }),
        );
      }
      await delay(200);
      return {
        added: 3,
        updated: packages.length - 3,
        skipped: 6,
        removed: 0,
        scannedFiles: total,
        totalSize: packages.reduce((x, p) => x + p.size, 0),
        durationMs: 1680,
        roots: scanDirs.filter((d) => d.enabled).map((d) => d.path),
      } as T;
    }

    default:
      throw new Error(`未知的演示命令：${cmd}`);
  }
}
