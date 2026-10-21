import { useState } from "react";
import type { ScanDir, ScanProgress, ScanSettings, ScanSummary } from "../lib/types";
import { api, errorMessage, isDemo } from "../lib/api";
import { formatSize, relativeTime, shortPath } from "../lib/format";
import { Icon } from "../components/Icon";
import { FormatBadge } from "../components/PackageViews";
import { Switch } from "../components/ui";

const FORMATS: Array<{ fmt: string; desc: string }> = [
  { fmt: "EXE", desc: "可执行安装程序" },
  { fmt: "MSI", desc: "Windows 安装包" },
  { fmt: "MSIX", desc: "商店应用包" },
  { fmt: "APPX", desc: "应用包" },
  { fmt: "MSU", desc: "系统更新" },
  { fmt: "ZIP", desc: "压缩包" },
  { fmt: "7Z", desc: "压缩包" },
  { fmt: "RAR", desc: "压缩包" },
  { fmt: "ISO", desc: "光盘镜像" },
  { fmt: "APK", desc: "安卓安装包" },
  { fmt: "DEB", desc: "Debian 包" },
  { fmt: "RPM", desc: "RedHat 包" },
  { fmt: "DMG", desc: "macOS 镜像" },
  { fmt: "JAR", desc: "Java 程序" },
];

export function ScannerPage({
  scanDirs,
  scanning,
  progress,
  lastSummary,
  settings,
  onOptionChange,
  onScan,
  onRefresh,
  notify,
}: {
  scanDirs: ScanDir[];
  scanning: boolean;
  progress: ScanProgress | null;
  lastSummary: ScanSummary | null;
  settings: ScanSettings;
  onOptionChange: (settings: ScanSettings) => void;
  onScan: () => void;
  onRefresh: () => Promise<void> | void;
  notify: (kind: "success" | "error" | "info", text: string) => void;
}) {
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick() {
    try {
      const path = await api.pickFolder();
      if (!path) return;
      const list = await api.addScanDir(path);
      notify("success", "已添加扫描目录");
      await onRefresh();
      void list;
    } catch (e) {
      notify("error", errorMessage(e));
    }
  }

  async function addManual() {
    if (!manual.trim()) return;
    setBusy(true);
    try {
      await api.addScanDir(manual.trim());
      setManual("");
      setShowManual(false);
      notify("success", "已添加扫描目录");
      await onRefresh();
    } catch (e) {
      notify("error", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(dir: ScanDir) {
    try {
      await api.removeScanDir(dir.id);
      notify("info", "已移除扫描目录（库中条目保留）");
      await onRefresh();
    } catch (e) {
      notify("error", errorMessage(e));
    }
  }

  async function toggle(dir: ScanDir, enabled: boolean) {
    try {
      await api.toggleScanDir(dir.id, enabled);
      await onRefresh();
    } catch (e) {
      notify("error", errorMessage(e));
    }
  }

  return (
    <div className="page-stack">
      <div className="page-lead">
        <div>
          <h2>让 PkgHub 自动找到你的安装包</h2>
          <p>
            指定存放安装包的目录，扫描时会递归查找 EXE / MSI / MSIX / 压缩包等文件，自动识别版本、架构并归类入库。
          </p>
        </div>
        <div className="page-lead-actions">
          <button className="btn" onClick={pick}>
            <Icon name="folder" size={14} />
            选择目录
          </button>
          <button className="btn btn-primary" onClick={onScan} disabled={scanning || !scanDirs.length}>
            <Icon name="scan" size={14} />
            {scanning ? "扫描中…" : "开始扫描"}
          </button>
        </div>
      </div>

      <div className="scan-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h3>扫描目录</h3>
              <p>{scanDirs.filter((d) => d.enabled).length} 个已启用</p>
            </div>
            <button className="btn btn-sm" onClick={() => setShowManual((v) => !v)}>
              <Icon name="plus" size={13} />
              手动输入
            </button>
          </div>

          {showManual && (
            <div className="manual-row">
              <input
                className="input"
                placeholder="例如 D:\Downloads\安装包"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManual()}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={addManual} disabled={busy}>
                添加
              </button>
            </div>
          )}

          <div className="card-body no-pad-top">
            <ul className="scan-dir-list">
              {scanDirs.map((d) => (
                <li key={d.id} className={d.enabled ? "" : "disabled"}>
                  <span className="dir-icon">
                    <Icon name="folder" size={15} />
                  </span>
                  <div className="dir-main">
                    <strong title={d.path}>{shortPath(d.path, 44)}</strong>
                    <em>
                      {d.packageCount} 个安装包 ·{" "}
                      {d.lastScanAt ? `上次扫描 ${relativeTime(d.lastScanAt)}` : "尚未扫描"}
                    </em>
                  </div>
                  <div className="dir-tools">
                    <Switch checked={d.enabled} onChange={(v) => toggle(d, v)} />
                    <button className="icon-btn tiny" title="在资源管理器中打开" onClick={() => api.openFolder(d.path).catch((e) => notify("error", errorMessage(e)))}>
                      <Icon name="external" size={14} />
                    </button>
                    <button className="icon-btn tiny danger" title="移除" onClick={() => remove(d)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </li>
              ))}
              {!scanDirs.length && (
                <li className="empty-row">还没有扫描目录，先点右上角「选择目录」</li>
              )}
            </ul>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h3>扫描选项</h3>
              <p>控制扫描范围与深度</p>
            </div>
          </div>
          <div className="card-body">
            <div className="option-row">
              <div>
                <strong>包含压缩包</strong>
                <em>ZIP / 7Z / RAR / ISO 等也一并入库</em>
              </div>
              <Switch
                checked={settings.includeArchives}
                onChange={(v) => onOptionChange({ ...settings, includeArchives: v })}
              />
            </div>

            <div className="option-row">
              <div>
                <strong>扫描深度</strong>
                <em>目录层级过深会拖慢扫描速度</em>
              </div>
              <select
                className="input select"
                value={settings.maxDepth}
                onChange={(e) => onOptionChange({ ...settings, maxDepth: Number(e.target.value) })}
              >
                <option value={2}>2 层</option>
                <option value={4}>4 层</option>
                <option value={8}>8 层</option>
                <option value={16}>16 层</option>
              </select>
            </div>

            <div className="option-col">
              <strong>跳过类型</strong>
              <em>点按切换：实心为收录，置灰为扫描时忽略（如 JAR）</em>
              <div className="fmt-toggles">
                {FORMATS.map((f) => {
                  const skipped = settings.skipFormats.includes(f.fmt);
                  return (
                    <button
                      key={f.fmt}
                      className={`fmt-toggle${skipped ? " skipped" : ""}`}
                      title={`${f.desc} · ${skipped ? "当前跳过，点击恢复收录" : "当前收录，点击扫描时忽略"}`}
                      onClick={() => {
                        const skipFormats = skipped
                          ? settings.skipFormats.filter((x) => x !== f.fmt)
                          : [...settings.skipFormats, f.fmt];
                        onOptionChange({ ...settings, skipFormats });
                      }}
                    >
                      <FormatBadge format={f.fmt} />
                      <span>{f.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="scan-actions">
              <button className="btn btn-primary btn-block" onClick={onScan} disabled={scanning || !scanDirs.length}>
                <Icon name="scan" size={15} />
                {scanning ? "正在扫描…" : "扫描全部启用目录"}
              </button>
              {isDemo && <p className="hint">当前是浏览器预览模式，扫描结果为演示数据</p>}
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h3>支持识别的文件类型</h3>
            <p>可安装格式会直接启动安装程序，压缩包与镜像标记为「打开」</p>
          </div>
        </div>
        <div className="card-body">
          <div className="fmt-cloud">
            {FORMATS.map((f) => (
              <span className="fmt-cell" key={f.fmt}>
                <FormatBadge format={f.fmt} />
                <em>{f.desc}</em>
              </span>
            ))}
          </div>
          <ul className="rules">
            <li>
              <Icon name="check" size={13} />
              自动跳过 Windows、AppData、node_modules 等系统与缓存目录
            </li>
            <li>
              <Icon name="check" size={13} />
              自动忽略卸载程序（unins000.exe 等）与小于 40KB 的可执行文件
            </li>
            <li>
              <Icon name="check" size={13} />
              重复扫描同一目录只更新已有条目，不会产生重复副本
            </li>
          </ul>
        </div>
      </section>

      {(scanning || progress || lastSummary) && (        <section className="card">
          <div className="card-head">
            <div>
              <h3>{scanning ? "扫描进行中" : "最近一次扫描结果"}</h3>
              <p>
                {scanning
                  ? progress?.current
                    ? `正在处理 ${shortPath(progress.current, 60)}`
                    : "正在遍历目录…"
                  : lastSummary
                    ? `耗时 ${(lastSummary.durationMs / 1000).toFixed(1)} 秒`
                    : ""}
              </p>
            </div>
            {scanning && <span className="live-dot">运行中</span>}
          </div>
          <div className="card-body">
            {scanning && (
              <div className="progress-block">
                <div className="progress-track">
                  <div className="progress-shimmer" />
                </div>
                <div className="progress-meta">
                  <span>已扫描 {progress?.scanned ?? 0} 个文件</span>
                  <span>发现 {progress?.found ?? 0} 个安装包</span>
                </div>
              </div>
            )}

            {lastSummary && !scanning && (
              <>
                <div className="result-grid">
                  <Result label="新增" value={lastSummary.added} tone="ok" />
                  <Result label="更新" value={lastSummary.updated} tone="info" />
                  <Result label="清理失效" value={lastSummary.removed} tone="warn" />
                  <Result label="扫描文件" value={lastSummary.scannedFiles} tone="plain" />
                </div>
                <div className="result-foot">
                  <span>
                    <Icon name="hardDrive" size={14} />
                    本次识别体积 {formatSize(lastSummary.totalSize)}
                  </span>
                  <span>
                    <Icon name="folder" size={14} />
                    {lastSummary.roots.length} 个目录
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Result({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`result-cell tone-${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
