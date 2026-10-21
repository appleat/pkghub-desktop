use std::path::Path;
use std::sync::LazyLock;
use std::time::UNIX_EPOCH;

use regex::Regex;
use rusqlite::{params, Connection, OptionalExtension};
use walkdir::{DirEntry, WalkDir};

use crate::db::now;
use crate::models::ScanProgress;

static VERSION_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(\d+(?:\.\d+){1,3}(?:[-_.]?(?:alpha|beta|rc|pre|preview|dev|build|patch)\d*)?)")
        .unwrap()
});

/// 扫描时跳过的系统/缓存目录
const SKIP_DIRS: &[&str] = &[
    "$recycle.bin",
    "system volume information",
    "windows",
    "windows.old",
    "node_modules",
    ".git",
    ".svn",
    ".cache",
    "appdata",
    "programdata",
    "recovery",
    "perflogs",
    "temp",
    "tmp",
];

/// 明显不是安装包的可执行文件关键词
const EXE_BLACKLIST: &[&str] = &[
    "unins000",
    "unins001",
    "uninstall",
    "卸载",
    "setup.tmp",
    "~$",
    "crashpad",
    "update.exe.old",
];

/// 从文件名中剔除的无意义词
const NOISE_TOKENS: &[&str] = &[
    "setup",
    "installer",
    "install",
    "installer64",
    "portable",
    "x64",
    "x86",
    "win64",
    "win32",
    "amd64",
    "arm64",
    "aarch64",
    "64bit",
    "32bit",
    "full",
    "official",
    "zh-cn",
    "zh_cn",
    "en-us",
    "en_us",
    "cn",
    "beta",
    "alpha",
    "rc",
    "web",
    "online",
    "offline",
    "安装包",
    "安装程序",
    "官方版",
    "绿色版",
    "破解版",
    "免费版",
    "完整版",
];

#[derive(Debug, Clone)]
pub struct Found {
    pub name: String,
    pub file_name: String,
    pub path: String,
    pub version: Option<String>,
    pub format: String,
    pub size: i64,
    pub arch: Option<String>,
    pub installable: bool,
    pub mtime: i64,
}

/// 返回 (格式标签, 是否可直接安装)
pub fn detect_format(path: &Path) -> Option<(&'static str, bool)> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    let v = match ext.as_str() {
        "exe" => ("EXE", true),
        "msi" => ("MSI", true),
        "msix" | "msixbundle" => ("MSIX", true),
        "appx" | "appxbundle" => ("APPX", true),
        "msu" => ("MSU", true),
        "pkg" => ("PKG", true),
        "deb" => ("DEB", true),
        "rpm" => ("RPM", true),
        "appimage" => ("APPIMAGE", true),
        "apk" => ("APK", true),
        "jar" => ("JAR", true),
        "zip" => ("ZIP", false),
        "7z" => ("7Z", false),
        "rar" => ("RAR", false),
        "tar" => ("TAR", false),
        "gz" => ("GZ", false),
        "tgz" => ("TGZ", false),
        "xz" => ("XZ", false),
        "iso" => ("ISO", false),
        "dmg" => ("DMG", false),
        "cab" => ("CAB", false),
        _ => return None,
    };
    Some(v)
}

pub fn parse_version(text: &str) -> Option<String> {
    let mut best: Option<(usize, usize, String)> = None;
    for cap in VERSION_RE.captures_iter(text) {
        if let Some(m) = cap.get(1) {
            let s = m.as_str().to_string();
            let dots = s.matches('.').count();
            let score = dots * 1000 + m.start();
            if best.as_ref().map(|b| score > b.0).unwrap_or(true) {
                best = Some((score, m.start(), s));
            }
        }
    }
    best.map(|(_, _, s)| s)
}

pub fn detect_arch(text: &str) -> Option<String> {
    let t = text.to_ascii_lowercase();
    for (needle, label) in [
        ("arm64", "ARM64"),
        ("aarch64", "ARM64"),
        ("x86_64", "x64"),
        ("x64", "x64"),
        ("amd64", "x64"),
        ("win64", "x64"),
        ("64bit", "x64"),
        ("64-bit", "x64"),
        ("x86", "x86"),
        ("win32", "x86"),
        ("i386", "x86"),
        ("32bit", "x86"),
        ("32-bit", "x86"),
    ] {
        if t.contains(needle) {
            return Some(label.to_string());
        }
    }
    None
}

/// 把文件名清洗成展示用的软件名
pub fn clean_name(stem: &str) -> String {
    // 先去掉粘连在末尾的 setup / installer 后缀，如 WeChatSetup -> WeChat
    let mut base = stem.trim().to_string();
    for suf in ["setup", "installer", "install"] {
        let low = base.to_ascii_lowercase();
        if low.ends_with(suf) && base.len() > suf.len() + 1 {
            let cut = base.len() - suf.len();
            base.truncate(cut);
            base = base.trim_end_matches(['_', '-', '.', ' ']).to_string();
            break;
        }
    }

    let replaced = base.replace(['_', '-'], " ");
    let stripped = VERSION_RE.replace_all(&replaced, " ");
    let mut out: Vec<String> = Vec::new();
    for token in stripped.split_whitespace() {
        let low = token.to_ascii_lowercase();
        let trimmed = low.trim_matches(|c: char| c == '.' || c == '(' || c == ')' || c == '[' || c == ']');
        // 版本号被剔除后残留的单个 v
        if trimmed == "v" || NOISE_TOKENS.contains(&trimmed) {
            continue;
        }
        out.push(
            token
                .trim_matches(|c: char| c == '.' || c == '(' || c == ')' || c == '[' || c == ']')
                .to_string(),
        );
    }
    let joined = out.join(" ").trim().to_string();
    if joined.is_empty() {
        stem.trim().to_string()
    } else {
        joined
    }
}

fn is_skipped_dir(entry: &DirEntry) -> bool {
    if !entry.file_type().is_dir() {
        return false;
    }
    let name = entry.file_name().to_string_lossy().to_ascii_lowercase();
    name.starts_with('.') || SKIP_DIRS.contains(&name.as_str())
}

fn mtime_secs(md: &std::fs::Metadata) -> i64 {
    md.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// 递归扫描一个目录，返回发现的安装包
pub fn walk_root(
    root: &Path,
    include_archives: bool,
    max_depth: usize,
    skip_formats: &std::collections::HashSet<String>,
    mut on_progress: impl FnMut(ScanProgress),
) -> (Vec<Found>, usize) {
    let mut found: Vec<Found> = Vec::new();
    let mut scanned = 0usize;

    let walker = WalkDir::new(root)
        .max_depth(max_depth)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| !is_skipped_dir(e));

    for entry in walker.filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        scanned += 1;
        if scanned % 150 == 0 {
            on_progress(ScanProgress {
                root: root.to_string_lossy().to_string(),
                scanned,
                found: found.len(),
                current: entry.path().to_string_lossy().to_string(),
            });
        }

        let path = entry.path();
        let (format, installable) = match detect_format(path) {
            Some(v) => v,
            None => continue,
        };
        if !include_archives && !installable {
            continue;
        }
        // 用户配置的“跳过类型”
        if skip_formats.contains(format) {
            continue;
        }

        let file_name = entry.file_name().to_string_lossy().to_string();
        let lower = file_name.to_ascii_lowercase();
        if EXE_BLACKLIST.iter().any(|k| lower.contains(k)) {
            continue;
        }

        let md = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let size = md.len() as i64;
        // 过滤掉明显不是安装包的小文件
        if format == "EXE" && size < 40 * 1024 {
            continue;
        }

        let stem = path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| file_name.clone());

        found.push(Found {
            name: clean_name(&stem),
            version: parse_version(&stem),
            arch: detect_arch(&stem),
            file_name,
            path: path.to_string_lossy().to_string(),
            format: format.to_string(),
            size,
            installable,
            mtime: mtime_secs(&md),
        });
    }

    on_progress(ScanProgress {
        root: root.to_string_lossy().to_string(),
        scanned,
        found: found.len(),
        current: String::new(),
    });

    (found, scanned)
}

/// 读取分类关键词规则
pub fn load_rules(conn: &Connection) -> Vec<(i64, Vec<String>)> {
    let mut stmt = match conn.prepare("SELECT id, keywords FROM categories ORDER BY sort_order ASC, id ASC") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    let rows = stmt.query_map([], |r| {
        Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?))
    });
    let mut out = Vec::new();
    if let Ok(rows) = rows {
        for row in rows.flatten() {
            let (id, keywords) = row;
            let list: Vec<String> = keywords
                .split(',')
                .map(|k| k.trim().to_ascii_lowercase())
                .filter(|k| !k.is_empty())
                .collect();
            if !list.is_empty() {
                out.push((id, list));
            }
        }
    }
    out
}

/// 按关键词匹配分类，命中长度最长者优先
pub fn classify(rules: &[(i64, Vec<String>)], haystack: &str, fallback: Option<i64>) -> Option<i64> {
    let low = haystack.to_ascii_lowercase();
    let mut best: Option<(usize, i64)> = None;
    for (id, keywords) in rules {
        for kw in keywords {
            if low.contains(kw) {
                let score = kw.chars().count();
                if best.as_ref().map(|b| score > b.0).unwrap_or(true) {
                    best = Some((score, *id));
                }
            }
        }
    }
    best.map(|b| b.1).or(fallback)
}

/// 批量入库，返回 (新增, 更新)
pub fn insert_found(
    conn: &mut Connection,
    items: &[Found],
    rules: &[(i64, Vec<String>)],
    fallback: Option<i64>,
) -> rusqlite::Result<(i64, i64)> {
    let ts = now();
    let tx = conn.transaction()?;
    let mut added = 0i64;
    let mut updated = 0i64;

    for f in items {
        let existing: Option<(i64, Option<i64>)> = tx
            .query_row(
                "SELECT id, category_id FROM packages WHERE path = ?1",
                params![f.path],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()?;

        match existing {
            Some((id, cat)) => {
                tx.execute(
                    "UPDATE packages SET size = ?2, file_mtime = ?3, format = ?4,
                        version = COALESCE(version, ?5), arch = COALESCE(arch, ?6),
                        name = CASE WHEN name = '' THEN ?7 ELSE name END, updated_at = ?8
                     WHERE id = ?1",
                    params![id, f.size, f.mtime, f.format, f.version, f.arch, f.name, ts],
                )?;
                if cat.is_none() {
                    let guess = classify(rules, &f.file_name, fallback);
                    if let Some(cid) = guess {
                        tx.execute(
                            "UPDATE packages SET category_id = ?1 WHERE id = ?2",
                            params![cid, id],
                        )?;
                    }
                }
                updated += 1;
            }
            None => {
                let cid = classify(rules, &f.file_name, fallback);
                tx.execute(
                    "INSERT INTO packages (name, file_name, path, version, category_id, format, size, arch,
                        installable, favorite, launch_count, file_mtime, added_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, 0, ?10, ?11, ?11)",
                    params![
                        f.name,
                        f.file_name,
                        f.path,
                        f.version,
                        cid,
                        f.format,
                        f.size,
                        f.arch,
                        f.installable,
                        f.mtime,
                        ts
                    ],
                )?;
                added += 1;
            }
        }
    }

    tx.commit()?;
    Ok((added, updated))
}

/// 清理磁盘上已不存在的条目（限定在给定根目录内）
pub fn prune_missing(conn: &Connection, roots: &[String]) -> rusqlite::Result<i64> {
    let mut stmt = conn.prepare("SELECT id, path FROM packages")?;
    let rows: Vec<(i64, String)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    drop(stmt);

    let mut removed = 0i64;
    for (id, path) in rows {
        let in_root = roots
            .iter()
            .any(|r| path.to_ascii_lowercase().starts_with(&r.to_ascii_lowercase()));
        if in_root && !Path::new(&path).exists() {
            conn.execute("DELETE FROM packages WHERE id = ?1", params![id])?;
            removed += 1;
        }
    }
    Ok(removed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_version() {
        assert_eq!(parse_version("Google Chrome 120.0.6099.130").as_deref(), Some("120.0.6099.130"));
        assert_eq!(parse_version("node-v20.11.0-x64").as_deref(), Some("20.11.0"));
        assert_eq!(parse_version("Setup_1.2.3").as_deref(), Some("1.2.3"));
        assert_eq!(parse_version("WeChatSetup"), None);
        assert_eq!(parse_version("v2.0").as_deref(), Some("2.0"));
    }

    #[test]
    fn cleans_names() {
        assert_eq!(clean_name("WeChatSetup"), "WeChat");
        assert_eq!(clean_name("Google_Chrome_120.0.6099.130_x64_setup"), "Google Chrome");
        assert_eq!(clean_name("Notepad++_v8.6_Installer"), "Notepad++");
        assert_eq!(clean_name("Visual Studio Code 1.85.0 (x64)"), "Visual Studio Code");
    }

    #[test]
    fn detects_arch() {
        assert_eq!(detect_arch("app-x64.exe").as_deref(), Some("x64"));
        assert_eq!(detect_arch("app-win32.exe").as_deref(), Some("x86"));
        assert_eq!(detect_arch("app-arm64.exe").as_deref(), Some("ARM64"));
        assert_eq!(detect_arch("app.exe"), None);
    }

    #[test]
    fn classifies_by_keyword() {
        let rules = vec![
            (1, vec!["vscode".to_string()]),
            (2, vec!["chrome".to_string()]),
        ];
        assert_eq!(classify(&rules, "VSCodeSetup-x64.exe", Some(9)), Some(1));
        assert_eq!(classify(&rules, "chrome_installer.exe", Some(9)), Some(2));
        assert_eq!(classify(&rules, "unknown.exe", Some(9)), Some(9));
    }

    #[test]
    fn scans_and_stores_packages() {
        use std::fs;
        let dir = std::env::temp_dir().join(format!("pkghub-scan-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("sub")).unwrap();
        fs::write(
            dir.join("Google_Chrome_120.0.6099.130_x64_setup.exe"),
            vec![0u8; 60 * 1024],
        )
        .unwrap();
        fs::write(dir.join("sub").join("node-v20.11.0-x64.msi"), vec![0u8; 2048]).unwrap();
        fs::write(dir.join("sub").join("some-lib-1.0.jar"), vec![0u8; 4096]).unwrap();
        fs::write(dir.join("notes.txt"), b"not an installer").unwrap();
        fs::write(dir.join("unins000.exe"), vec![0u8; 100 * 1024]).unwrap();

        let skip = std::collections::HashSet::new();
        let (found, scanned) = walk_root(&dir, true, 8, &skip, |_| {});
        assert_eq!(scanned, 5, "应统计到 5 个文件");
        assert_eq!(found.len(), 3, "应识别出 3 个安装包");

        // 跳过 JAR 类型后应只剩 2 个
        let skip_jar: std::collections::HashSet<String> = ["JAR".to_string()].into();
        let (found2, _) = walk_root(&dir, true, 8, &skip_jar, |_| {});
        assert_eq!(found2.len(), 2, "JAR 应被跳过");
        assert!(found2.iter().all(|f| f.format != "JAR"));

        let chrome = found.iter().find(|f| f.format == "EXE").unwrap();
        assert_eq!(chrome.name, "Google Chrome");
        assert_eq!(chrome.version.as_deref(), Some("120.0.6099.130"));
        assert_eq!(chrome.arch.as_deref(), Some("x64"));

        let mut conn = Connection::open_in_memory().unwrap();
        crate::db::init_schema(&conn).unwrap();
        let rules = load_rules(&conn);
        let fallback = crate::db::fallback_category(&conn);
        let (added, updated) = insert_found(&mut conn, &found2, &rules, fallback).unwrap();
        assert_eq!((added, updated), (2, 0));

        // 再入库一次应该只更新，不重复
        let (added2, updated2) = insert_found(&mut conn, &found2, &rules, fallback).unwrap();
        assert_eq!((added2, updated2), (0, 2));

        let cat: String = conn
            .query_row(
                "SELECT c.name FROM packages p JOIN categories c ON c.id = p.category_id WHERE p.format = 'EXE'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(cat, "网络浏览");

        // 文件被删掉后应被清理
        fs::remove_file(dir.join("sub").join("node-v20.11.0-x64.msi")).unwrap();
        let removed = prune_missing(&conn, &[dir.to_string_lossy().to_string()]).unwrap();
        assert_eq!(removed, 1);
        let left: i64 = conn.query_row("SELECT COUNT(*) FROM packages", [], |r| r.get(0)).unwrap();
        assert_eq!(left, 1);

        let _ = fs::remove_dir_all(&dir);
    }
}
