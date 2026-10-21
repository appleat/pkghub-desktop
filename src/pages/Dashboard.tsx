import type { Dashboard, PageKey, Pkg, ScanDir } from "../lib/types";
import { formatSize, relativeTime, shortPath } from "../lib/format";
import { Bars, Donut } from "../components/charts";
import { Icon, type IconName } from "../components/Icon";
import { FormatBadge } from "../components/PackageViews";

const FORMAT_COLORS: Record<string, string> = {
  EXE: "#6366f1",
  MSI: "#0ea5e9",
  MSIX: "#8b5cf6",
  APPX: "#a855f7",
  MSU: "#0891b2",
  ZIP: "#f59e0b",
  "7Z": "#f97316",
  RAR: "#ef4444",
  ISO: "#14b8a6",
  DMG: "#64748b",
  APK: "#22c55e",
  DEB: "#d946ef",
  RPM: "#f43f5e",
  JAR: "#eab308",
};

const KIND_ICON: Record<string, IconName> = {
  scan: "scan",
  launch: "play",
  category: "tag",
  delete: "trash",
  import: "download",
};

export function DashboardPage({
  stats,
  scanDirs,
  onOpenPackage,
  onNavigate,
  onScan,
  scanning,
}: {
  stats: Dashboard | null;
  scanDirs: ScanDir[];
  onOpenPackage: (p: Pkg) => void;
  onNavigate: (p: PageKey) => void;
  onScan: () => void;
  scanning: boolean;
}) {
  if (!stats) {
    return (
      <div className="skeleton-grid">
        {[0, 1, 2, 3].map((i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
    );
  }

  const avgSize = stats.totalPackages > 0 ? stats.totalSize / stats.totalPackages : 0;
  const topFormats = stats.byFormat.slice(0, 6);
  const restCount = stats.byFormat.slice(6).reduce((a, f) => a + f.count, 0);
  const donutData = [
    ...topFormats.map((f) => ({
      label: f.format,
      value: f.count,
      color: FORMAT_COLORS[f.format] ?? "#94a3b8",
    })),
    ...(restCount > 0 ? [{ label: "其他格式", value: restCount, color: "#cbd5e1" }] : []),
  ];
  const catBars = stats.byCategory.slice(0, 7).map((c) => ({
    label: c.name,
    value: c.size,
    color: c.color,
    meta: `${formatSize(c.size)} · ${c.count} 个`,
  }));
  const biggestBars = stats.biggest.map((p) => ({
    label: p.name,
    value: p.size,
    color: "#6366f1",
    meta: formatSize(p.size),
  }));

  return (
    <div className="page-stack">
      <div className="stat-grid">
        <StatCard
          icon="package"
          tone="indigo"
          label="安装包总数"
          value={String(stats.totalPackages)}
          sub={`其中 ${stats.installableCount} 个可直接安装`}
        />
        <StatCard
          icon="hardDrive"
          tone="sky"
          label="占用空间"
          value={formatSize(stats.totalSize)}
          sub={`平均每个 ${formatSize(avgSize)}`}
        />
        <StatCard
          icon="layers"
          tone="violet"
          label="分类 / 格式"
          value={`${stats.categoryCount} / ${stats.formatCount}`}
          sub={`${stats.scanDirCount} 个扫描目录`}
        />
        <StatCard
          icon="sparkles"
          tone="amber"
          label="本月新增"
          value={String(stats.addedThisMonth)}
          sub={`上月 ${stats.addedLastMonth} 个`}
        />
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>格式分布</h3>
              <p>按安装包数量统计</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate("packages")}>
              查看全部
              <Icon name="chevronRight" size={13} />
            </button>
          </div>
          <div className="card-body donut-row">
            <Donut
              data={donutData}
              centerValue={String(stats.totalPackages)}
              centerLabel="个安装包"
            />
            <ul className="legend">
              {donutData.map((d) => (
                <li key={d.label}>
                  <i style={{ background: d.color }} />
                  <span className="legend-label">{d.label}</span>
                  <span className="legend-count">{d.value}</span>
                  <span className="legend-pct">
                    {stats.totalPackages ? Math.round((d.value / stats.totalPackages) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3>分类占用空间</h3>
              <p>哪类软件最占硬盘</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate("categories")}>
              管理分类
              <Icon name="chevronRight" size={13} />
            </button>
          </div>
          <div className="card-body">
            {catBars.length ? <Bars data={catBars} /> : <div className="muted">还没有数据</div>}
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>最近入库</h3>
              <p>最新收录的软件包</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate("packages")}>
              软件库
              <Icon name="chevronRight" size={13} />
            </button>
          </div>
          <div className="card-body no-pad-top">
            <ul className="recent-list">
              {stats.recentPackages.map((p) => (
                <li key={p.id} onClick={() => onOpenPackage(p)}>
                  <FormatBadge format={p.format} />
                  <div className="recent-main">
                    <strong>{p.name}</strong>
                    <span>
                      {p.categoryName ?? "未分类"}
                      {p.version ? ` · v${p.version}` : ""}
                    </span>
                  </div>
                  <div className="recent-right">
                    <span className="mono">{formatSize(p.size)}</span>
                    <em>{relativeTime(p.addedAt)}</em>
                  </div>
                </li>
              ))}
              {!stats.recentPackages.length && (
                <li className="empty-row">还没有软件包，先去「扫描入库」添加一个目录</li>
              )}
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3>最近动态</h3>
              <p>扫描、安装与整理记录</p>
            </div>
          </div>
          <div className="card-body">
            <ul className="timeline">
              {stats.recentActivity.map((a) => (
                <li key={a.id}>
                  <span className={`tl-dot tl-${a.kind}`}>
                    <Icon name={KIND_ICON[a.kind] ?? "info"} size={12} />
                  </span>
                  <div className="tl-main">
                    <p>{a.message}</p>
                    <em>{relativeTime(a.createdAt)}</em>
                  </div>
                </li>
              ))}
              {!stats.recentActivity.length && <li className="empty-row">暂无动态</li>}
            </ul>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>占用空间 TOP 5</h3>
              <p>体积最大的安装包</p>
            </div>
          </div>
          <div className="card-body">
            {biggestBars.length ? <Bars data={biggestBars} /> : <div className="muted">还没有数据</div>}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3>扫描来源</h3>
              <p>已登记的安装包目录</p>
            </div>
            <button className="btn btn-sm" onClick={onScan} disabled={scanning}>
              <Icon name="refresh" size={13} />
              {scanning ? "扫描中" : "立即扫描"}
            </button>
          </div>
          <div className="card-body no-pad-top">
            <ul className="dir-list">
              {scanDirs.map((d) => (
                <li key={d.id}>
                  <span className="dir-icon">
                    <Icon name="folder" size={15} />
                  </span>
                  <div className="dir-main">
                    <strong title={d.path}>{shortPath(d.path, 34)}</strong>
                    <em>
                      {d.packageCount} 个 · {d.lastScanAt ? `上次扫描 ${relativeTime(d.lastScanAt)}` : "尚未扫描"}
                    </em>
                  </div>
                  <span className={`pill ${d.enabled ? "pill-ok" : "pill-off"}`}>{d.enabled ? "启用" : "暂停"}</span>
                </li>
              ))}
              {!scanDirs.length && <li className="empty-row">还没有添加扫描目录</li>}
            </ul>
            <button className="link-btn" onClick={() => onNavigate("scanner")}>
              管理扫描目录
              <Icon name="chevronRight" size={13} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: IconName;
  tone: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon tone-${tone}`}>
        <Icon name={icon} size={19} />
      </div>
      <div className="stat-main">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        <span className="stat-sub">{sub}</span>
      </div>
    </div>
  );
}
