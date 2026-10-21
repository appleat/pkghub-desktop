use std::path::Path;
use std::process::Command;
use std::sync::Arc;
use std::sync::Mutex;

use rusqlite::{params, Connection};
use tauri::{AppHandle, Emitter, State};

use crate::db::{self, Db};
use crate::models::*;
use crate::scanner;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

fn hidden(program: &str) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

fn ps_quote(path: &str) -> String {
    path.replace('\'', "''")
}

/* ------------------------------- 查询 ------------------------------- */

#[tauri::command]
pub fn get_dashboard(db: State<'_, Db>) -> Result<DashboardStats, String> {
    let conn = db.conn();
    db::dashboard(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_packages(db: State<'_, Db>, query: PackageQuery) -> Result<Vec<Package>, String> {
    let conn = db.conn();
    db::list_packages(&conn, &query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_package_detail(db: State<'_, Db>, id: i64) -> Result<Package, String> {
    let conn = db.conn();
    db::get_package(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_categories(db: State<'_, Db>) -> Result<Vec<Category>, String> {
    let conn = db.conn();
    db::list_categories(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_scan_dirs(db: State<'_, Db>) -> Result<Vec<ScanDir>, String> {
    let conn = db.conn();
    db::list_scan_dirs(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_activities(db: State<'_, Db>, limit: Option<i64>) -> Result<Vec<Activity>, String> {
    let conn = db.conn();
    db::list_activities(&conn, limit.unwrap_or(20)).map_err(|e| e.to_string())
}

/* ----------------------------- 软件包操作 ----------------------------- */

#[tauri::command]
pub fn set_package_category(db: State<'_, Db>, id: i64, category_id: Option<i64>) -> Result<Package, String> {
    let conn = db.conn();
    conn.execute(
        "UPDATE packages SET category_id = ?1, updated_at = ?2 WHERE id = ?3",
        params![category_id, db::now(), id],
    )
    .map_err(|e| e.to_string())?;
    db::get_package(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_favorite(db: State<'_, Db>, id: i64) -> Result<bool, String> {
    let conn = db.conn();
    conn.execute("UPDATE packages SET favorite = 1 - favorite WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.query_row("SELECT favorite FROM packages WHERE id = ?1", params![id], |r| r.get(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_package(db: State<'_, Db>, id: i64, name: String) -> Result<Package, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("名称不能为空".into());
    }
    let conn = db.conn();
    conn.execute(
        "UPDATE packages SET name = ?1, updated_at = ?2 WHERE id = ?3",
        params![trimmed, db::now(), id],
    )
    .map_err(|e| e.to_string())?;
    db::get_package(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_package_notes(db: State<'_, Db>, id: i64, notes: String) -> Result<(), String> {
    let conn = db.conn();
    conn.execute(
        "UPDATE packages SET notes = ?1, updated_at = ?2 WHERE id = ?3",
        params![notes, db::now(), id],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}

/// 启动安装程序
#[tauri::command]
pub fn launch_package(db: State<'_, Db>, id: i64, elevated: Option<bool>) -> Result<(), String> {
    let conn = db.conn();
    let (path, name): (String, String) = conn
        .query_row("SELECT path, name FROM packages WHERE id = ?1", params![id], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })
        .map_err(|_| "找不到该安装包".to_string())?;

    if !Path::new(&path).exists() {
        return Err(format!("文件已不存在：{}", path));
    }

    let ext = Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if elevated.unwrap_or(false) {
        let script = format!(
            "Start-Process -FilePath '{}' -Verb RunAs",
            ps_quote(&path)
        );
        hidden("powershell")
            .args(["-NoProfile", "-Command", &script])
            .spawn()
            .map_err(|e| format!("无法以管理员身份启动：{}", e))?;
    } else {
        match ext.as_str() {
            "exe" | "msi" => {
                if ext == "msi" {
                    Command::new("msiexec")
                        .args(["/i", &path])
                        .spawn()
                        .map_err(|e| format!("启动安装程序失败：{}", e))?;
                } else {
                    Command::new(&path)
                        .spawn()
                        .map_err(|e| format!("启动安装程序失败：{}", e))?;
                }
            }
            "msix" | "msixbundle" | "appx" | "appxbundle" => {
                hidden("explorer").arg(&path).spawn().map_err(|e| e.to_string())?;
            }
            _ => {
                hidden("cmd")
                    .args(["/C", "start", "", &path])
                    .spawn()
                    .map_err(|e| format!("无法打开文件：{}", e))?;
            }
        }
    }

    let _ = conn.execute(
        "UPDATE packages SET launch_count = launch_count + 1, last_launched_at = ?1 WHERE id = ?2",
        params![db::now(), id],
    );
    db::log_activity(&conn, "launch", &format!("启动了 {} 的安装程序", name));
    Ok(())
}

#[tauri::command]
pub fn reveal_package(db: State<'_, Db>, id: i64) -> Result<(), String> {
    let conn = db.conn();
    let path: String = conn
        .query_row("SELECT path FROM packages WHERE id = ?1", params![id], |r| r.get(0))
        .map_err(|_| "找不到该安装包".to_string())?;
    if !Path::new(&path).exists() {
        return Err("文件已不存在".into());
    }
    Command::new("explorer")
        .arg(format!("/select,{}", path))
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_folder(path: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err("目录不存在".into());
    }
    hidden("explorer").arg(&path).spawn().map(|_| ()).map_err(|e| e.to_string())
}

/// 删除条目，可选同时把文件移入回收站
#[tauri::command]
pub fn delete_package(db: State<'_, Db>, id: i64, delete_file: Option<bool>) -> Result<(), String> {
    let conn = db.conn();
    let (path, name): (String, String) = conn
        .query_row("SELECT path, name FROM packages WHERE id = ?1", params![id], |r| {
            Ok((r.get(0)?, r.get(1)?))
        })
        .map_err(|_| "找不到该安装包".to_string())?;

    if delete_file.unwrap_or(false) && Path::new(&path).exists() {
        let script = format!(
            "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('{}', 'OnlyErrorDialogs', 'SendToRecycleBin')",
            ps_quote(&path)
        );
        let status = hidden("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .status()
            .map_err(|e| format!("移入回收站失败：{}", e))?;
        if !status.success() {
            return Err("移入回收站失败，文件可能被占用".into());
        }
    }

    conn.execute("DELETE FROM packages WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    db::log_activity(
        &conn,
        "delete",
        &format!("移除了 {}（{}）", name, if delete_file.unwrap_or(false) { "文件已回收" } else { "仅移出库" }),
    );
    Ok(())
}

/* ------------------------------ 分类管理 ------------------------------ */

#[tauri::command]
pub fn create_category(db: State<'_, Db>, input: CategoryInput) -> Result<Vec<Category>, String> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err("分类名称不能为空".into());
    }
    let conn = db.conn();
    let order: i64 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories", [], |r| r.get(0))
        .unwrap_or(99);
    conn.execute(
        "INSERT INTO categories (name, color, icon, keywords, builtin, sort_order) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
        params![
            name,
            input.color.unwrap_or_else(|| "#64748b".into()),
            input.icon.unwrap_or_else(|| "box".into()),
            input.keywords.unwrap_or_default(),
            order
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "已存在同名分类".to_string()
        } else {
            e.to_string()
        }
    })?;
    db::log_activity(&conn, "category", &format!("新建了分类「{}」", name));
    db::list_categories(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_category(db: State<'_, Db>, id: i64, input: CategoryInput) -> Result<Vec<Category>, String> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err("分类名称不能为空".into());
    }
    let conn = db.conn();
    conn.execute(
        "UPDATE categories SET name = ?1, color = COALESCE(?2, color), icon = COALESCE(?3, icon), keywords = COALESCE(?4, keywords) WHERE id = ?5",
        params![name, input.color, input.icon, input.keywords, id],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "已存在同名分类".to_string()
        } else {
            e.to_string()
        }
    })?;
    db::log_activity(&conn, "category", &format!("更新了分类「{}」", name));
    db::list_categories(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_category(db: State<'_, Db>, id: i64) -> Result<Vec<Category>, String> {
    let conn = db.conn();
    let (name, count): (String, i64) = conn
        .query_row(
            "SELECT c.name, (SELECT COUNT(*) FROM packages p WHERE p.category_id = c.id) FROM categories c WHERE c.id = ?1",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| "找不到该分类".to_string())?;
    conn.execute("UPDATE packages SET category_id = NULL WHERE category_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    db::log_activity(
        &conn,
        "category",
        &format!("删除了分类「{}」，{} 个软件转为未分类", name, count),
    );
    db::list_categories(&conn).map_err(|e| e.to_string())
}

/// 对未分类的软件重新跑一遍关键词匹配
#[tauri::command]
pub fn reclassify_uncategorized(db: State<'_, Db>) -> Result<i64, String> {
    let conn = db.conn();
    let rules = scanner::load_rules(&conn);
    let fallback = db::fallback_category(&conn);
    let mut stmt = conn
        .prepare("SELECT id, file_name FROM packages WHERE category_id IS NULL")
        .map_err(|e| e.to_string())?;
    let rows: Vec<(i64, String)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(stmt);
    let mut n = 0i64;
    for (id, file_name) in rows {
        if let Some(cid) = scanner::classify(&rules, &file_name, fallback) {
            if conn
                .execute("UPDATE packages SET category_id = ?1 WHERE id = ?2", params![cid, id])
                .is_ok()
            {
                n += 1;
            }
        }
    }
    if n > 0 {
        db::log_activity(&conn, "category", &format!("自动归类了 {} 个软件", n));
    }
    Ok(n)
}

/* ----------------------------- 扫描目录管理 ----------------------------- */

#[tauri::command]
pub fn add_scan_dir(db: State<'_, Db>, path: String) -> Result<Vec<ScanDir>, String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Err("请选择一个存在的目录".into());
    }
    let normalized = p.to_string_lossy().trim_end_matches(['\\', '/']).to_string();
    let conn = db.conn();
    conn.execute(
        "INSERT OR IGNORE INTO scan_dirs (path, enabled) VALUES (?1, 1)",
        params![normalized],
    )
    .map_err(|e| e.to_string())?;
    db::list_scan_dirs(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_scan_dir(db: State<'_, Db>, id: i64) -> Result<Vec<ScanDir>, String> {
    let conn = db.conn();
    conn.execute("DELETE FROM scan_dirs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    db::list_scan_dirs(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_scan_dir(db: State<'_, Db>, id: i64, enabled: bool) -> Result<Vec<ScanDir>, String> {
    let conn = db.conn();
    conn.execute(
        "UPDATE scan_dirs SET enabled = ?1 WHERE id = ?2",
        params![enabled, id],
    )
    .map_err(|e| e.to_string())?;
    db::list_scan_dirs(&conn).map_err(|e| e.to_string())
}

/// 调用系统文件夹选择框
#[tauri::command]
pub fn pick_folder() -> Result<Option<String>, String> {
    #[cfg(windows)]
    {
        let script = r#"Add-Type -AssemblyName System.Windows.Forms;
$d = New-Object System.Windows.Forms.FolderBrowserDialog;
$d.Description = '选择安装包所在目录';
$d.ShowNewFolderButton = $true;
if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.SelectedPath }"#;
        let out = hidden("powershell")
            .args(["-NoProfile", "-STA", "-Command", script])
            .output()
            .map_err(|e| e.to_string())?;
        let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
        Ok(if path.is_empty() { None } else { Some(path) })
    }
    #[cfg(not(windows))]
    {
        Err("当前平台暂不支持目录选择，请手动输入路径".into())
    }
}

/* -------------------------------- 扫描 -------------------------------- */

fn scan_impl(app: &AppHandle, conn: Arc<Mutex<Connection>>, roots: Vec<String>) -> Result<ScanSummary, String> {
    let started = std::time::Instant::now();
    let mut summary = ScanSummary {
        roots: roots.clone(),
        ..Default::default()
    };

    // 从数据库读取扫描设置（包含压缩包 / 深度 / 跳过类型）
    let (include_archives, max_depth, skip_formats) = {
        let guard = conn.lock().map_err(|e| e.to_string())?;
        let s = db::scan_settings(&guard);
        (s.include_archives, s.max_depth, s.skip_formats)
    };
    let skip: std::collections::HashSet<String> = skip_formats.into_iter().map(|f| f.to_uppercase()).collect();

    for root in &roots {
        let p = Path::new(root);
        if !p.is_dir() {
            continue;
        }
        let (found, scanned) =
            scanner::walk_root(p, include_archives, max_depth, &skip, |prog| {
                let _ = app.emit("scan-progress", prog);
            });
        summary.scanned_files += scanned as i64;
        summary.total_size += found.iter().map(|f| f.size).sum::<i64>();

        let mut guard = conn.lock().map_err(|e| e.to_string())?;
        let rules = scanner::load_rules(&guard);
        let fallback = db::fallback_category(&guard);
        let (added, updated) = scanner::insert_found(&mut guard, &found, &rules, fallback)
            .map_err(|e| e.to_string())?;
        summary.added += added;
        summary.updated += updated;
        let _ = guard.execute(
            "UPDATE scan_dirs SET last_scan_at = ?1 WHERE path = ?2",
            params![db::now(), root],
        );
    }

    {
        let guard = conn.lock().map_err(|e| e.to_string())?;
        summary.removed = scanner::prune_missing(&guard, &roots).unwrap_or(0);
        db::log_activity(
            &guard,
            "scan",
            &format!(
                "扫描完成：新增 {} 个，更新 {} 个，清理 {} 个失效条目",
                summary.added, summary.updated, summary.removed
            ),
        );
    }

    summary.duration_ms = started.elapsed().as_millis() as i64;
    Ok(summary)
}

#[tauri::command]
pub async fn scan_directories(app: AppHandle, db: State<'_, Db>, paths: Vec<String>) -> Result<ScanSummary, String> {
    if paths.is_empty() {
        return Err("请先添加要扫描的目录".into());
    }
    let conn = db.0.clone();
    tauri::async_runtime::spawn_blocking(move || scan_impl(&app, conn, paths))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn rescan_all(app: AppHandle, db: State<'_, Db>) -> Result<ScanSummary, String> {
    let roots: Vec<String> = {
        let conn = db.conn();
        let mut stmt = conn
            .prepare("SELECT path FROM scan_dirs WHERE enabled = 1 ORDER BY id")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |r| r.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };
    if roots.is_empty() {
        return Err("还没有添加扫描目录".into());
    }
    let conn = db.0.clone();
    tauri::async_runtime::spawn_blocking(move || scan_impl(&app, conn, roots))
        .await
        .map_err(|e| e.to_string())?
}

/* ------------------------------ 扫描设置 ------------------------------ */

#[tauri::command]
pub fn get_scan_settings(db: State<'_, Db>) -> Result<ScanSettings, String> {
    let conn = db.conn();
    Ok(db::scan_settings(&conn))
}

#[tauri::command]
pub fn set_scan_settings(db: State<'_, Db>, settings: ScanSettings) -> Result<(), String> {
    let conn = db.conn();
    db::save_scan_settings(&conn, &settings).map_err(|e| e.to_string())
}
