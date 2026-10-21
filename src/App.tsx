import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Category,
  Dashboard,
  PageKey,
  Pkg,
  ScanDir,
  ScanProgress,
  ScanSettings,
  ScanSummary,
} from "./lib/types";
import { api, errorMessage, isDemo, onScanProgress } from "./lib/api";
import { formatSize } from "./lib/format";
import { Icon, type IconName } from "./components/Icon";
import { ToastStack, type ToastItem } from "./components/ui";
import { PackageDrawer } from "./components/PackageDrawer";
import { DashboardPage } from "./pages/Dashboard";
import { PackagesPage } from "./pages/Packages";
import { CategoriesPage } from "./pages/Categories";
import { ScannerPage } from "./pages/Scanner";

const NAV: Array<{ key: PageKey; label: string; icon: IconName; title: string; sub: string }> = [
  { key: "dashboard", label: "仪表盘", icon: "dashboard", title: "仪表盘", sub: "软件库全貌与近期动态" },
  { key: "packages", label: "软件库", icon: "package", title: "软件库", sub: "浏览、筛选并启动安装程序" },
  { key: "categories", label: "分类管理", icon: "layers", title: "分类管理", sub: "自定义分类与自动归类规则" },
  { key: "scanner", label: "扫描入库", icon: "scan", title: "扫描入库", sub: "指定目录，自动识别并收录安装包" },
];

const PAGES: PageKey[] = ["dashboard", "packages", "categories", "scanner"];

function pageFromHash(): PageKey {
  const hash = window.location.hash.replace("#", "");
  return (PAGES as string[]).includes(hash) ? (hash as PageKey) : "dashboard";
}

export default function App() {
  const [page, setPage] = useState<PageKey>(pageFromHash);
  const [stats, setStats] = useState<Dashboard | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scanDirs, setScanDirs] = useState<ScanDir[]>([]);
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<Pkg | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [lastSummary, setLastSummary] = useState<ScanSummary | null>(null);
  const [scanSettings, setScanSettings] = useState<ScanSettings>({
    includeArchives: true,
    maxDepth: 8,
    skipFormats: [],
  });
  const [focusCategory, setFocusCategory] = useState<number | null>(null);
  const toastSeq = useRef(0);

  const notify = useCallback((kind: ToastItem["kind"], text: string) => {
    const id = ++toastSeq.current;
    setToasts((list) => [...list, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, kind === "error" ? 5200 : 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [d, c, s, st] = await Promise.all([
        api.getDashboard(),
        api.listCategories(),
        api.listScanDirs(),
        api.getScanSettings(),
      ]);
      setStats(d);
      setCategories(c);
      setScanDirs(s);
      setScanSettings(st);
      setVersion((v) => v + 1);
    } catch (e) {
      notify("error", errorMessage(e));
    }
  }, [notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (window.location.hash !== `#${page}`) window.location.hash = page;
  }, [page]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let alive = true;
    onScanProgress((p) => {
      if (alive) setProgress(p);
    }).then((un) => {
      if (alive) unlisten = un;
      else un();
    });
    return () => {
      alive = false;
      unlisten?.();
    };
  }, []);

  const runScan = useCallback(
    async (paths?: string[]) => {
      if (scanning) return;
      setScanning(true);
      setProgress(null);
      setLastSummary(null);
      setPage("scanner");
      try {
        const summary =
          paths && paths.length ? await api.scanDirectories(paths) : await api.rescanAll();
        setLastSummary(summary);
        notify(
          "success",
          `扫描完成：新增 ${summary.added} 个，更新 ${summary.updated} 个${
            summary.removed ? `，清理 ${summary.removed} 个失效条目` : ""
          }`,
        );
        await refresh();
      } catch (e) {
        notify("error", errorMessage(e));
      } finally {
        setScanning(false);
        setProgress(null);
      }
    },
    [scanning, notify, refresh],
  );

  const handleLaunch = useCallback(
    async (p: Pkg, elevated = false) => {
      try {
        await api.launchPackage(p.id, elevated);
        notify("success", `正在启动 ${p.name} 的安装程序`);
        await refresh();
        setSelected((cur) => (cur && cur.id === p.id ? { ...cur, launchCount: cur.launchCount + 1 } : cur));
      } catch (e) {
        notify("error", errorMessage(e));
      }
    },
    [notify, refresh],
  );

  const handleReveal = useCallback(
    async (p: Pkg) => {
      try {
        await api.revealPackage(p.id);
      } catch (e) {
        notify("error", errorMessage(e));
      }
    },
    [notify],
  );

  const handleFavorite = useCallback(
    async (p: Pkg) => {
      try {
        const fav = await api.toggleFavorite(p.id);
        setSelected((cur) => (cur && cur.id === p.id ? { ...cur, favorite: fav } : cur));
        await refresh();
      } catch (e) {
        notify("error", errorMessage(e));
      }
    },
    [notify, refresh],
  );

  const current = NAV.find((n) => n.key === page)!;
  const formats = stats ? stats.byFormat.map((f) => f.format) : [];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="package" size={20} />
          </span>
          <div className="brand-text">
            <strong>软件库</strong>
            <em>本地安装包库</em>
          </div>
        </div>

        <nav className="nav">
          <span className="nav-label">工作台</span>
          {NAV.map((item) => (
            <button
              key={item.key}
              className={`nav-item${page === item.key ? " active" : ""}`}
              onClick={() => {
                setPage(item.key);
                if (item.key === "packages") setFocusCategory(null);
              }}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.key === "packages" && stats && <em className="nav-count">{stats.totalPackages}</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="storage-card">
            <div className="storage-head">
              <span>库容量</span>
              <strong>{formatSize(stats?.totalSize ?? 0)}</strong>
            </div>
            <div className="storage-bar">
              {(stats?.byCategory ?? []).slice(0, 6).map((c) => {
                const pct = stats && stats.totalSize ? (c.size / stats.totalSize) * 100 : 0;
                return <i key={c.name} style={{ width: `${pct}%`, background: c.color }} title={`${c.name} ${formatSize(c.size)}`} />;
              })}
            </div>
            <p>
              {stats?.totalPackages ?? 0} 个安装包 · {stats?.categoryCount ?? 0} 个分类
            </p>
            <button className="btn btn-sm btn-block" onClick={() => runScan()} disabled={scanning || !scanDirs.length}>
              <Icon name="refresh" size={13} />
              {scanning ? "扫描中…" : "重新扫描"}
            </button>
          </div>
          <div className="version-tag">PkgHub v1.0.0</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{current.title}</h1>
            <p>{current.sub}</p>
          </div>
          <div className="topbar-actions">
            {isDemo && (
              <span className="demo-badge" title="当前在浏览器中预览，数据为演示数据">
                预览模式 · 演示数据
              </span>
            )}
            <button className="btn" onClick={() => refresh()} title="刷新数据">
              <Icon name="refresh" size={14} />
              刷新
            </button>
            <button className="btn btn-primary" onClick={() => runScan()} disabled={scanning}>
              <Icon name="scan" size={14} />
              {scanning ? "扫描中…" : "扫描入库"}
            </button>
          </div>
        </header>

        <div className="content">
          {page === "dashboard" && (
            <DashboardPage
              stats={stats}
              scanDirs={scanDirs}
              onOpenPackage={(p) => setSelected(p)}
              onNavigate={(p) => setPage(p)}
              onScan={() => runScan()}
              scanning={scanning}
            />
          )}

          {page === "packages" && (
            <PackagesPage
              categories={categories}
              formats={formats}
              version={version}
              focusCategory={focusCategory}
              onOpenPackage={(p) => setSelected(p)}
              onLaunch={(p) => handleLaunch(p)}
              onReveal={handleReveal}
              onToggleFavorite={handleFavorite}
              onScan={() => runScan()}
              notify={notify}
            />
          )}

          {page === "categories" && (
            <CategoriesPage
              categories={categories}
              onBrowse={(id) => {
                setFocusCategory(id);
                setPage("packages");
              }}
              onRefresh={refresh}
              notify={notify}
            />
          )}

          {page === "scanner" && (
            <ScannerPage
              scanDirs={scanDirs}
              scanning={scanning}
              progress={progress}
              lastSummary={lastSummary}
              settings={scanSettings}
              onOptionChange={(next) => {
                setScanSettings(next);
                api.setScanSettings(next).catch((e) => notify("error", errorMessage(e)));
              }}
              onScan={() => runScan()}
              onRefresh={refresh}
              notify={notify}
            />
          )}
        </div>
      </main>

      <PackageDrawer
        pkg={selected}
        categories={categories}
        onClose={() => setSelected(null)}
        onLaunch={(elevated) => selected && handleLaunch(selected, elevated)}
        onReveal={() => selected && handleReveal(selected)}
        onDelete={async (deleteFile) => {
          if (!selected) return;
          try {
            await api.deletePackage(selected.id, deleteFile);
            notify("success", `已移除 ${selected.name}`);
            setSelected(null);
            await refresh();
          } catch (e) {
            notify("error", errorMessage(e));
          }
        }}
        onCategoryChange={async (categoryId) => {
          if (!selected) return;
          try {
            const updated = await api.setPackageCategory(selected.id, categoryId);
            setSelected(updated);
            await refresh();
          } catch (e) {
            notify("error", errorMessage(e));
          }
        }}
        onRename={async (name) => {
          if (!selected || !name.trim()) return;
          try {
            const updated = await api.renamePackage(selected.id, name.trim());
            setSelected(updated);
            await refresh();
          } catch (e) {
            notify("error", errorMessage(e));
          }
        }}
        onSaveNotes={async (notes) => {
          if (!selected) return;
          try {
            await api.setPackageNotes(selected.id, notes);
            notify("success", "备注已保存");
            await refresh();
          } catch (e) {
            notify("error", errorMessage(e));
          }
        }}
        onToggleFavorite={() => selected && handleFavorite(selected)}
      />

      <ToastStack items={toasts} onDismiss={(id) => setToasts((l) => l.filter((t) => t.id !== id))} />
    </div>
  );
}
