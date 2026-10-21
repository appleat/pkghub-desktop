import { useState } from "react";
import type { Category, CategoryInput } from "../lib/types";
import { api, errorMessage } from "../lib/api";
import { formatSize } from "../lib/format";
import { Icon, type IconName } from "../components/Icon";
import { Field, Modal } from "../components/ui";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
  "#3b82f6",
  "#64748b",
  "#a16207",
];

const ICONS: IconName[] = ["code", "briefcase", "palette", "play", "wrench", "shield", "globe", "chat", "game", "box", "layers", "tag"];

export function CategoriesPage({
  categories,
  onBrowse,
  onRefresh,
  notify,
}: {
  categories: Category[];
  onBrowse: (categoryId: number) => void;
  onRefresh: () => Promise<void> | void;
  notify: (kind: "success" | "error" | "info", text: string) => void;
}) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const totalPackages = categories.reduce((a, c) => a + c.packageCount, 0);

  async function submit(input: CategoryInput) {
    setBusy(true);
    try {
      if (editing) {
        await api.updateCategory(editing.id, input);
        notify("success", `已更新分类「${input.name}」`);
      } else {
        await api.createCategory(input);
        notify("success", `已创建分类「${input.name}」`);
      }
      await onRefresh();
      setEditing(null);
      setCreating(false);
    } catch (e) {
      notify("error", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteCategory(deleting.id);
      notify("success", `已删除分类「${deleting.name}」，其下软件转为未分类`);
      await onRefresh();
      setDeleting(null);
    } catch (e) {
      notify("error", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function autoClassify() {
    try {
      const n = await api.reclassifyUncategorized();
      await onRefresh();
      notify(n > 0 ? "success" : "info", n > 0 ? `已自动归类 ${n} 个软件` : "没有可自动归类的软件");
    } catch (e) {
      notify("error", errorMessage(e));
    }
  }

  return (
    <div className="page-stack">
      <div className="page-lead">
        <div>
          <h2>用分类把软件库整理清楚</h2>
          <p>
            每个分类可以配置关键词，扫描入库时会按文件名自动归类。当前共 {categories.length} 个分类，覆盖 {totalPackages} 个安装包。
          </p>
        </div>
        <div className="page-lead-actions">
          <button className="btn" onClick={autoClassify}>
            <Icon name="sparkles" size={14} />
            自动归类未分类项
          </button>
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} />
            新建分类
          </button>
        </div>
      </div>

      <div className="cat-grid">
        {categories.map((c) => (
          <div className="cat-card" key={c.id}>
            <div className="cat-card-top">
              <span className="cat-icon" style={{ background: `${c.color}18`, color: c.color }}>
                <Icon name={c.icon as IconName} size={19} />
              </span>
              <div className="cat-tools">
                <button className="icon-btn tiny" title="编辑" onClick={() => setEditing(c)}>
                  <Icon name="edit" size={14} />
                </button>
                <button className="icon-btn tiny danger" title="删除" onClick={() => setDeleting(c)}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
            <h3>{c.name}</h3>
            <p className="cat-stats">
              <strong>{c.packageCount}</strong> 个 · {formatSize(c.totalSize)}
            </p>
            <div className="cat-keywords">
              {c.keywords
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean)
                .slice(0, 4)
                .map((k) => (
                  <span className="kw" key={k}>
                    {k}
                  </span>
                ))}
              {c.keywords.split(",").filter((k) => k.trim()).length > 4 && (
                <span className="kw kw-more">+{c.keywords.split(",").filter((k) => k.trim()).length - 4}</span>
              )}
              {!c.keywords.trim() && <span className="kw kw-empty">未配置关键词</span>}
            </div>
            <button className="cat-link" onClick={() => onBrowse(c.id)}>
              查看该分类
              <Icon name="chevronRight" size={13} />
            </button>
          </div>
        ))}

        <button className="cat-card cat-add" onClick={() => setCreating(true)}>
          <span className="cat-add-icon">
            <Icon name="plus" size={22} />
          </span>
          <strong>新建分类</strong>
          <em>自定义颜色、图标与关键词</em>
        </button>
      </div>

      {(creating || editing) && (
        <CategoryModal
          key={editing ? `edit-${editing.id}` : "new"}
          initial={editing}
          busy={busy}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={submit}
        />
      )}

      <Modal
        open={Boolean(deleting)}
        title={`删除分类「${deleting?.name ?? ""}」？`}
        subtitle="该分类下的软件不会被删除，只会变成「未分类」"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <button className="btn" onClick={() => setDeleting(null)}>
              取消
            </button>
            <button className="btn btn-danger" onClick={remove} disabled={busy}>
              确认删除
            </button>
          </>
        }
      >
        <p className="modal-text">
          当前有 <strong>{deleting?.packageCount ?? 0}</strong> 个软件属于该分类，删除后它们会回到「未分类」，
          可以随时重新指定。
        </p>
      </Modal>
    </div>
  );
}

function CategoryModal({
  initial,
  busy,
  onClose,
  onSubmit,
}: {
  initial: Category | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: CategoryInput) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [icon, setIcon] = useState<IconName>((initial?.icon as IconName) ?? "box");
  const [keywords, setKeywords] = useState(initial?.keywords ?? "");

  return (
    <Modal
      open
      title={initial ? "编辑分类" : "新建分类"}
      subtitle="关键词用英文逗号分隔，扫描时会按文件名自动匹配"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            disabled={busy || !name.trim()}
            onClick={() => onSubmit({ name, color, icon, keywords })}
          >
            {initial ? "保存修改" : "创建分类"}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <Field label="分类名称">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：设计工具" />
        </Field>

        <Field label="标识颜色">
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`swatch${color === c ? " on" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </Field>

        <Field label="图标">
          <div className="icon-picker">
            {ICONS.map((ic) => (
              <button
                key={ic}
                className={`icon-choice${icon === ic ? " on" : ""}`}
                onClick={() => setIcon(ic)}
                style={icon === ic ? { color, borderColor: `${color}66`, background: `${color}14` } : undefined}
              >
                <Icon name={ic} size={18} />
              </button>
            ))}
          </div>
        </Field>

        <Field label="自动归类关键词" hint="可选">
          <textarea
            className="textarea"
            rows={3}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="chrome, firefox, edge, 浏览器"
          />
        </Field>
      </div>
    </Modal>
  );
}
