import type { Pkg } from "../lib/types";
import { formatSize, shortPath } from "../lib/format";
import { Icon } from "./Icon";

export function FormatBadge({ format, large }: { format: string; large?: boolean }) {
  return (
    <span className={`fmt-badge${large ? " fmt-lg" : ""}`} data-fmt={format}>
      {format}
    </span>
  );
}

export function PackageCard({
  pkg,
  onOpen,
  onLaunch,
  onReveal,
  onToggleFavorite,
}: {
  pkg: Pkg;
  onOpen: () => void;
  onLaunch: () => void;
  onReveal: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <article className="pkg-card" onClick={onOpen}>
      <div className="pkg-top">
        <FormatBadge format={pkg.format} />
        <button
          className={`icon-btn star${pkg.favorite ? " active" : ""}`}
          title={pkg.favorite ? "取消收藏" : "收藏"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          <Icon name="star" size={16} filled={pkg.favorite} />
        </button>
      </div>

      <h3 className="pkg-name" title={pkg.name}>
        {pkg.name}
      </h3>

      <div className="pkg-chips">
        {pkg.categoryName ? (
          <span className="chip" style={{ color: pkg.categoryColor ?? "#64748b", background: `${pkg.categoryColor ?? "#64748b"}14` }}>
            {pkg.categoryName}
          </span>
        ) : (
          <span className="chip chip-muted">未分类</span>
        )}
        {pkg.version && <span className="chip chip-ghost">v{pkg.version}</span>}
        {pkg.arch && <span className="chip chip-ghost">{pkg.arch}</span>}
      </div>

      <div className="pkg-foot">
        <span className="pkg-size">{formatSize(pkg.size)}</span>
        <span className="pkg-dot" />
        <span className="pkg-path" title={pkg.path}>
          {shortPath(pkg.path, 30)}
        </span>
      </div>

      <div className="pkg-actions">
        <button
          className="btn btn-primary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onLaunch();
          }}
          title={pkg.installable ? "启动安装程序" : "打开文件"}
        >
          <Icon name="play" size={13} filled />
          {pkg.installable ? "安装" : "打开"}
        </button>
        <button
          className="btn btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onReveal();
          }}
        >
          <Icon name="folder" size={13} />
          定位
        </button>
      </div>
    </article>
  );
}

export function PackageTable({
  packages,
  onOpen,
  onLaunch,
  onReveal,
  onToggleFavorite,
}: {
  packages: Pkg[];
  onOpen: (p: Pkg) => void;
  onLaunch: (p: Pkg) => void;
  onReveal: (p: Pkg) => void;
  onToggleFavorite: (p: Pkg) => void;
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 56 }}>格式</th>
            <th>名称</th>
            <th style={{ width: 130 }}>版本</th>
            <th style={{ width: 120 }}>分类</th>
            <th style={{ width: 92 }}>架构</th>
            <th style={{ width: 100, textAlign: "right" }}>大小</th>
            <th style={{ width: 110 }}>入库时间</th>
            <th style={{ width: 128 }} />
          </tr>
        </thead>
        <tbody>
          {packages.map((p) => (
            <tr key={p.id} onClick={() => onOpen(p)}>
              <td>
                <FormatBadge format={p.format} />
              </td>
              <td>
                <div className="cell-name">
                  <span>{p.name}</span>
                  {p.favorite && <Icon name="star" size={12} filled className="star-inline" />}
                </div>
                <div className="cell-sub" title={p.path}>
                  {shortPath(p.path, 62)}
                </div>
              </td>
              <td className="mono">{p.version ?? "—"}</td>
              <td>
                {p.categoryName ? (
                  <span className="chip" style={{ color: p.categoryColor ?? "#64748b", background: `${p.categoryColor ?? "#64748b"}14` }}>
                    {p.categoryName}
                  </span>
                ) : (
                  <span className="chip chip-muted">未分类</span>
                )}
              </td>
              <td className="muted">{p.arch ?? "—"}</td>
              <td className="mono" style={{ textAlign: "right" }}>
                {formatSize(p.size)}
              </td>
              <td className="muted">{p.addedAt.slice(0, 10)}</td>
              <td>
                <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn" title={p.installable ? "启动安装程序" : "打开"} onClick={() => onLaunch(p)}>
                    <Icon name="play" size={15} filled />
                  </button>
                  <button className="icon-btn" title="打开所在文件夹" onClick={() => onReveal(p)}>
                    <Icon name="folder" size={15} />
                  </button>
                  <button
                    className={`icon-btn${p.favorite ? " active" : ""}`}
                    title="收藏"
                    onClick={() => onToggleFavorite(p)}
                  >
                    <Icon name="star" size={15} filled={p.favorite} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
