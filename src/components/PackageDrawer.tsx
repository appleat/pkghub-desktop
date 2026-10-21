import { useEffect, useState } from "react";
import type { Category, Pkg } from "../lib/types";
import { formatDateTime, formatSize, relativeTime } from "../lib/format";
import { Icon } from "./Icon";
import { FormatBadge } from "./PackageViews";

export function PackageDrawer({
  pkg,
  categories,
  onClose,
  onLaunch,
  onReveal,
  onDelete,
  onCategoryChange,
  onRename,
  onSaveNotes,
  onToggleFavorite,
}: {
  pkg: Pkg | null;
  categories: Category[];
  onClose: () => void;
  onLaunch: (elevated: boolean) => void;
  onReveal: () => void;
  onDelete: (deleteFile: boolean) => void;
  onCategoryChange: (categoryId: number | null) => void;
  onRename: (name: string) => void;
  onSaveNotes: (notes: string) => void;
  onToggleFavorite: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setNotes(pkg?.notes ?? "");
    setEditingName(false);
    setConfirming(false);
    setNameDraft(pkg?.name ?? "");
  }, [pkg?.id, pkg?.notes, pkg?.name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pkg) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pkg, onClose]);

  if (!pkg) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className="drawer-head-top">
            <FormatBadge format={pkg.format} large />
            <div className="drawer-head-tools">
              <button className={`icon-btn${pkg.favorite ? " active" : ""}`} onClick={onToggleFavorite} title="收藏">
                <Icon name="star" size={17} filled={pkg.favorite} />
              </button>
              <button className="icon-btn" onClick={onClose} title="关闭">
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>

          {editingName ? (
            <div className="name-edit">
              <input
                className="input"
                value={nameDraft}
                autoFocus
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename(nameDraft);
                    setEditingName(false);
                  }
                  if (e.key === "Escape") setEditingName(false);
                }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onRename(nameDraft);
                  setEditingName(false);
                }}
              >
                保存
              </button>
            </div>
          ) : (
            <h2 className="drawer-title">
              {pkg.name}
              <button
                className="icon-btn tiny"
                title="重命名"
                onClick={() => {
                  setNameDraft(pkg.name);
                  setEditingName(true);
                }}
              >
                <Icon name="edit" size={14} />
              </button>
            </h2>
          )}

          <p className="drawer-path" title={pkg.path}>
            {pkg.path}
          </p>
        </div>

        <div className="drawer-actions">
          <button className="btn btn-primary" onClick={() => onLaunch(false)}>
            <Icon name="play" size={14} filled />
            {pkg.installable ? "启动安装程序" : "打开文件"}
          </button>
          {pkg.installable && (
            <button className="btn" onClick={() => onLaunch(true)} title="以管理员身份运行">
              <Icon name="shield" size={14} />
              管理员安装
            </button>
          )}
          <button className="btn" onClick={onReveal} title="在资源管理器中定位">
            <Icon name="folder" size={14} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="meta-grid">
            <Meta label="版本" value={pkg.version ? `v${pkg.version}` : "—"} />
            <Meta label="架构" value={pkg.arch ?? "通用"} />
            <Meta label="格式" value={pkg.format} />
            <Meta label="大小" value={formatSize(pkg.size)} />
            <Meta label="入库时间" value={formatDateTime(pkg.addedAt)} />
            <Meta label="文件修改" value={formatDateTime(new Date(pkg.fileMtime * 1000).toISOString())} />
            <Meta label="启动次数" value={`${pkg.launchCount} 次`} />
            <Meta label="最近启动" value={pkg.lastLaunchedAt ? relativeTime(pkg.lastLaunchedAt) : "从未"} />
            <Meta label="文件名" value={pkg.fileName} wide />
          </div>

          <div className="drawer-section">
            <label className="field-label">所属分类</label>
            <div className="category-picker">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`cat-pill${pkg.categoryId === c.id ? " active" : ""}`}
                  style={
                    pkg.categoryId === c.id
                      ? { background: `${c.color}18`, color: c.color, borderColor: `${c.color}55` }
                      : undefined
                  }
                  onClick={() => onCategoryChange(c.id)}
                >
                  <i style={{ background: c.color }} />
                  {c.name}
                </button>
              ))}
              <button
                className={`cat-pill${pkg.categoryId === null ? " active" : ""}`}
                onClick={() => onCategoryChange(null)}
              >
                未分类
              </button>
            </div>
          </div>

          <div className="drawer-section">
            <label className="field-label">备注</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="记录版本信息、激活方式、适用场景…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== (pkg.notes ?? "")) onSaveNotes(notes);
              }}
            />
          </div>

          <div className="drawer-section danger-zone">
            <label className="field-label">移除</label>
            {confirming ? (
              <div className="confirm-row">
                <button className="btn btn-sm btn-danger" onClick={() => onDelete(true)}>
                  移出并回收文件
                </button>
                <button className="btn btn-sm" onClick={() => onDelete(false)}>
                  仅移出库
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>
                  取消
                </button>
              </div>
            ) : (
              <button className="btn btn-sm btn-danger" onClick={() => setConfirming(true)}>
                <Icon name="trash" size={14} />
                从库中移除…
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function Meta({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`meta-item${wide ? " wide" : ""}`}>
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}
