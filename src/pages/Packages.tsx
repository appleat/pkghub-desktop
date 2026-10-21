import { useEffect, useMemo, useState } from "react";
import type { Category, Pkg } from "../lib/types";
import { api, errorMessage } from "../lib/api";
import { formatSize } from "../lib/format";
import { Icon } from "../components/Icon";
import { PackageCard, PackageTable } from "../components/PackageViews";
import { EmptyState } from "../components/ui";

type ViewMode = "grid" | "list";

export function PackagesPage({
  categories,
  formats,
  version,
  focusCategory,
  onOpenPackage,
  onLaunch,
  onReveal,
  onToggleFavorite,
  onScan,
  notify,
}: {
  categories: Category[];
  formats: string[];
  version: number;
  focusCategory: number | null;
  onOpenPackage: (p: Pkg) => void;
  onLaunch: (p: Pkg) => void;
  onReveal: (p: Pkg) => void;
  onToggleFavorite: (p: Pkg) => void;
  onScan: () => void;
  notify: (kind: "success" | "error" | "info", text: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [format, setFormat] = useState("ALL");
  const [sort, setSort] = useState("added");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [items, setItems] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 220);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (focusCategory !== null) setCategoryId(focusCategory);
  }, [focusCategory]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .listPackages({
        search: debounced || undefined,
        categoryId,
        format,
        sort,
        onlyFavorites,
      })
      .then((list) => {
        if (alive) setItems(list);
      })
      .catch((e) => notify("error", errorMessage(e)))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [debounced, categoryId, format, sort, onlyFavorites, version, notify]);

  const totalSize = useMemo(() => items.reduce((a, p) => a + p.size, 0), [items]);
  const filtered = Boolean(debounced) || categoryId !== null || format !== "ALL" || onlyFavorites;

  return (
    <div className="page-stack">
      <div className="toolbar card">
        <div className="search">
          <Icon name="search" size={16} />
          <input
            className="input search-input"
            placeholder="搜索名称、文件名或路径…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="icon-btn tiny search-clear" onClick={() => setSearch("")}>
              <Icon name="close" size={13} />
            </button>
          )}
        </div>

        <div className="toolbar-right">
          <select className="input select" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="ALL">全部格式</option>
            {formats.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select className="input select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="added">最新入库</option>
            <option value="name">名称 A→Z</option>
            <option value="size">体积从大到小</option>
            <option value="sizeAsc">体积从小到大</option>
            <option value="mtime">文件时间</option>
            <option value="format">按格式</option>
            <option value="category">按分类</option>
          </select>

          <button
            className={`btn${onlyFavorites ? " btn-active" : ""}`}
            onClick={() => setOnlyFavorites((v) => !v)}
            title="只看收藏"
          >
            <Icon name="star" size={14} filled={onlyFavorites} />
          </button>

          <div className="segmented">
            <button className={view === "grid" ? "on" : ""} onClick={() => setView("grid")} title="网格视图">
              <Icon name="grid" size={15} />
            </button>
            <button className={view === "list" ? "on" : ""} onClick={() => setView("list")} title="列表视图">
              <Icon name="list" size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="chips-row">
        <button
          className={`chip-filter${categoryId === null ? " active" : ""}`}
          onClick={() => setCategoryId(null)}
        >
          全部
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`chip-filter${categoryId === c.id ? " active" : ""}`}
            style={categoryId === c.id ? { background: `${c.color}18`, color: c.color, borderColor: `${c.color}55` } : undefined}
            onClick={() => setCategoryId(c.id)}
          >
            <i style={{ background: c.color }} />
            {c.name}
            <em>{c.packageCount}</em>
          </button>
        ))}
      </div>

      <div className="list-meta">
        <span>
          共 <strong>{items.length}</strong> 个安装包
          {filtered ? "（已筛选）" : ""} · 合计 <strong>{formatSize(totalSize)}</strong>
        </span>
        {loading && <span className="loading-dot">加载中…</span>}
      </div>

      {!items.length && !loading ? (
        <div className="card">
          <EmptyState
            icon="package"
            title={filtered ? "没有匹配的安装包" : "软件库还是空的"}
            hint={filtered ? "换个关键词或清空筛选条件试试" : "添加一个安装包目录，PkgHub 会自动识别版本与分类"}
            action={
              filtered ? (
                <button
                  className="btn"
                  onClick={() => {
                    setSearch("");
                    setCategoryId(null);
                    setFormat("ALL");
                    setOnlyFavorites(false);
                  }}
                >
                  清空筛选
                </button>
              ) : (
                <button className="btn btn-primary" onClick={onScan}>
                  <Icon name="scan" size={14} />
                  去扫描入库
                </button>
              )
            }
          />
        </div>
      ) : view === "grid" ? (
        <div className="pkg-grid">
          {items.map((p) => (
            <PackageCard
              key={p.id}
              pkg={p}
              onOpen={() => onOpenPackage(p)}
              onLaunch={() => onLaunch(p)}
              onReveal={() => onReveal(p)}
              onToggleFavorite={() => onToggleFavorite(p)}
            />
          ))}
        </div>
      ) : (
        <div className="card table-card">
          <PackageTable
            packages={items}
            onOpen={onOpenPackage}
            onLaunch={onLaunch}
            onReveal={onReveal}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
      )}
    </div>
  );
}
