use std::path::PathBuf;
use std::sync::{Arc, Mutex, MutexGuard};

use chrono::Local;
use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::models::*;

pub struct Db(pub Arc<Mutex<Connection>>);

impl Db {
    pub fn open(path: PathBuf) -> rusqlite::Result<Self> {
        let conn = Connection::open(path)?;
        init_schema(&conn)?;
        Ok(Db(Arc::new(Mutex::new(conn))))
    }

    pub fn conn(&self) -> MutexGuard<'_, Connection> {
        self.0.lock().unwrap()
    }
}

/// 建表 + 写入内置分类，供启动与测试复用
pub fn init_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(SCHEMA)?;
    seed_categories(conn)
}

pub fn now() -> String {
    Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

const SCHEMA: &str = r#"
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    color       TEXT NOT NULL DEFAULT '#64748b',
    icon        TEXT NOT NULL DEFAULT 'box',
    keywords    TEXT NOT NULL DEFAULT '',
    builtin     INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS packages (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL,
    file_name        TEXT NOT NULL,
    path             TEXT NOT NULL UNIQUE,
    version          TEXT,
    category_id      INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    format           TEXT NOT NULL,
    size             INTEGER NOT NULL DEFAULT 0,
    arch             TEXT,
    installable      INTEGER NOT NULL DEFAULT 1,
    favorite         INTEGER NOT NULL DEFAULT 0,
    notes            TEXT,
    launch_count     INTEGER NOT NULL DEFAULT 0,
    last_launched_at TEXT,
    file_mtime       INTEGER NOT NULL DEFAULT 0,
    added_at         TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_dirs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    path         TEXT NOT NULL UNIQUE,
    enabled      INTEGER NOT NULL DEFAULT 1,
    last_scan_at TEXT
);

CREATE TABLE IF NOT EXISTS activities (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT NOT NULL,
    message    TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pkg_category ON packages(category_id);
CREATE INDEX IF NOT EXISTS idx_pkg_format   ON packages(format);
CREATE INDEX IF NOT EXISTS idx_pkg_size     ON packages(size DESC);
"#;

type SeedCat = (&'static str, &'static str, &'static str, &'static str);

const SEED: &[SeedCat] = &[
    (
        "开发工具",
        "#6366f1",
        "code",
        "vscode,visual studio,vs code,git,node,nodejs,python,jdk,java,rust,docker,idea,pycharm,webstorm,goland,clion,android studio,mysql,postgres,navicat,postman,xshell,putty,ssms,sql server,maven,gradle,cmake,qt,golang,php,composer,redis,mongodb,wireshark,xftp,finalshell,sublime,notepad++,vim,emacs,tortoise,source tree,xampp,wamp",
    ),
    (
        "办公效率",
        "#0ea5e9",
        "briefcase",
        "office,wps,word,excel,powerpoint,acrobat,adobe reader,pdf,notion,obsidian,typora,onenote,evernote,印象笔记,xmind,visio,project,石墨,幕布,processon,calibre,foxit,万兴,翻译,有道,百度网盘,dropbox",
    ),
    (
        "图形设计",
        "#ec4899",
        "palette",
        "photoshop,illustrator,indesign,lightroom,figma,sketch,blender,3ds max,3dsmax,maya,autocad,cad,coreldraw,gimp,inkscape,axure,sketchup,rhino,zbrush,capture one,affinity,canva,美图,像素,绘声,墨刀",
    ),
    (
        "影音媒体",
        "#f59e0b",
        "play",
        "vlc,potplayer,premiere,after effects,audition,obs,audacity,格式工厂,format factory,kmplayer,spotify,itunes,剪映,davinci,handbrake,foobar,酷狗,网易云,qq音乐,爱奇艺,腾讯视频,mpc-hc,ffmpeg,录屏,剪辑",
    ),
    (
        "系统工具",
        "#10b981",
        "wrench",
        "driver,驱动,runtime,vcredist,visual c++,directx,.net,dotnet,7-zip,7zip,winrar,bandizip,ccleaner,diskgenius,partition,aida64,cpu-z,gpu-z,hwinfo,rufus,ventoy,everything,geek,uninstall,sogou,搜狗,输入法,terminal,powertoys,autoruns,sysinternals,显卡,声卡,网卡,压缩",
    ),
    (
        "安全防护",
        "#ef4444",
        "shield",
        "360,kaspersky,avast,avira,bitdefender,nod32,eset,火绒,电脑管家,malwarebytes,norton,mcafee,杀毒,安全卫士,virustotal,加密",
    ),
    (
        "网络浏览",
        "#3b82f6",
        "globe",
        "chrome,firefox,edge,opera,brave,vivaldi,浏览器,chromium,tor,加速器,vpn",
    ),
    (
        "通讯协作",
        "#8b5cf6",
        "chat",
        "wechat,微信,qq,dingtalk,钉钉,feishu,飞书,telegram,discord,slack,zoom,teams,skype,whatsapp,企业微信,腾讯会议,wecom,line,邮箱,mail",
    ),
    (
        "游戏娱乐",
        "#f97316",
        "game",
        "steam,epic,wegame,unity,unreal,blizzard,battle.net,origin,ea app,gog,游戏,game,模拟器,emulator,joytokey,网易,腾讯游戏",
    ),
    (
        "其他",
        "#64748b",
        "box",
        "",
    ),
];

fn seed_categories(conn: &Connection) -> rusqlite::Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM categories", [], |r| r.get(0))?;
    if count > 0 {
        return Ok(());
    }
    for (i, (name, color, icon, keywords)) in SEED.iter().enumerate() {
        conn.execute(
            "INSERT INTO categories (name, color, icon, keywords, builtin, sort_order) VALUES (?1, ?2, ?3, ?4, 1, ?5)",
            params![name, color, icon, keywords, i as i64],
        )?;
    }
    Ok(())
}

pub fn fallback_category(conn: &Connection) -> Option<i64> {
    conn.query_row(
        "SELECT id FROM categories WHERE name = '其他' ORDER BY id LIMIT 1",
        [],
        |r| r.get(0),
    )
    .optional()
    .ok()
    .flatten()
}

pub fn log_activity(conn: &Connection, kind: &str, message: &str) {
    let _ = conn.execute(
        "INSERT INTO activities (kind, message, created_at) VALUES (?1, ?2, ?3)",
        params![kind, message, now()],
    );
    // 只保留最近 300 条
    let _ = conn.execute(
        "DELETE FROM activities WHERE id NOT IN (SELECT id FROM activities ORDER BY id DESC LIMIT 300)",
        [],
    );
}

pub fn get_setting(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", params![key], |r| r.get(0))
        .optional()
        .ok()
        .flatten()
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map(|_| ())
}

/// 读取扫描设置（未配置时返回默认值）
pub fn scan_settings(conn: &Connection) -> ScanSettings {
    get_setting(conn, "scan")
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

pub fn save_scan_settings(conn: &Connection, settings: &ScanSettings) -> rusqlite::Result<()> {
    let raw = serde_json::to_string(settings).unwrap_or_default();
    set_setting(conn, "scan", &raw)
}

const PKG_COLS: &str ="p.id, p.name, p.file_name, p.path, p.version, p.category_id, c.name, c.color, \
                        p.format, p.size, p.arch, p.installable, p.favorite, p.notes, p.launch_count, \
                        p.last_launched_at, p.file_mtime, p.added_at";

fn row_to_package(row: &Row) -> rusqlite::Result<Package> {
    Ok(Package {
        id: row.get(0)?,
        name: row.get(1)?,
        file_name: row.get(2)?,
        path: row.get(3)?,
        version: row.get(4)?,
        category_id: row.get(5)?,
        category_name: row.get(6)?,
        category_color: row.get(7)?,
        format: row.get(8)?,
        size: row.get(9)?,
        arch: row.get(10)?,
        installable: row.get(11)?,
        favorite: row.get(12)?,
        notes: row.get(13)?,
        launch_count: row.get(14)?,
        last_launched_at: row.get(15)?,
        file_mtime: row.get(16)?,
        added_at: row.get(17)?,
    })
}

pub fn get_package(conn: &Connection, id: i64) -> rusqlite::Result<Package> {
    conn.query_row(
        &format!(
            "SELECT {} FROM packages p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?1",
            PKG_COLS
        ),
        params![id],
        row_to_package,
    )
}

pub fn list_packages(conn: &Connection, q: &PackageQuery) -> rusqlite::Result<Vec<Package>> {
    let mut sql = format!(
        "SELECT {} FROM packages p LEFT JOIN categories c ON c.id = p.category_id WHERE 1 = 1",
        PKG_COLS
    );
    let mut args: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(s) = q.search.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
        sql.push_str(" AND (p.name LIKE ? OR p.file_name LIKE ? OR p.path LIKE ?)");
        let like = format!("%{}%", s);
        args.push(Box::new(like.clone()));
        args.push(Box::new(like.clone()));
        args.push(Box::new(like));
    }
    if let Some(cid) = q.category_id {
        sql.push_str(" AND p.category_id = ?");
        args.push(Box::new(cid));
    }
    if let Some(f) = q.format.as_ref().filter(|f| !f.is_empty() && *f != "ALL") {
        sql.push_str(" AND p.format = ?");
        args.push(Box::new(f.clone()));
    }
    if q.only_favorites {
        sql.push_str(" AND p.favorite = 1");
    }
    if q.installable_only {
        sql.push_str(" AND p.installable = 1");
    }

    let order = match q.sort.as_deref().unwrap_or("added") {
        "name" => "p.name COLLATE NOCASE ASC",
        "size" => "p.size DESC",
        "sizeAsc" => "p.size ASC",
        "mtime" => "p.file_mtime DESC",
        "format" => "p.format ASC, p.size DESC",
        "category" => "COALESCE(c.name, 'zz') ASC, p.name COLLATE NOCASE ASC",
        _ => "p.id DESC",
    };
    sql.push_str(&format!(" ORDER BY {}", order));

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(args.iter()), row_to_package)?;
    rows.collect()
}

pub fn list_categories(conn: &Connection) -> rusqlite::Result<Vec<Category>> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.color, c.icon, c.keywords, c.builtin, c.sort_order,
                COUNT(p.id), COALESCE(SUM(p.size), 0)
         FROM categories c LEFT JOIN packages p ON p.category_id = c.id
         GROUP BY c.id ORDER BY c.sort_order ASC, c.id ASC",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(Category {
            id: r.get(0)?,
            name: r.get(1)?,
            color: r.get(2)?,
            icon: r.get(3)?,
            keywords: r.get(4)?,
            builtin: r.get(5)?,
            sort_order: r.get(6)?,
            package_count: r.get(7)?,
            total_size: r.get(8)?,
        })
    })?;
    rows.collect()
}

pub fn list_scan_dirs(conn: &Connection) -> rusqlite::Result<Vec<ScanDir>> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.path, s.enabled, s.last_scan_at,
                (SELECT COUNT(*) FROM packages p WHERE p.path LIKE s.path || '%')
         FROM scan_dirs s ORDER BY s.id ASC",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(ScanDir {
            id: r.get(0)?,
            path: r.get(1)?,
            enabled: r.get(2)?,
            last_scan_at: r.get(3)?,
            package_count: r.get(4)?,
        })
    })?;
    rows.collect()
}

pub fn list_activities(conn: &Connection, limit: i64) -> rusqlite::Result<Vec<Activity>> {
    let mut stmt = conn.prepare(
        "SELECT id, kind, message, created_at FROM activities ORDER BY id DESC LIMIT ?1",
    )?;
    let rows = stmt.query_map(params![limit], |r| {
        Ok(Activity {
            id: r.get(0)?,
            kind: r.get(1)?,
            message: r.get(2)?,
            created_at: r.get(3)?,
        })
    })?;
    rows.collect()
}

fn scalar(conn: &Connection, sql: &str) -> i64 {
    conn.query_row(sql, [], |r| r.get::<_, i64>(0)).unwrap_or(0)
}

pub fn dashboard(conn: &Connection) -> rusqlite::Result<DashboardStats> {
    let total_packages = scalar(conn, "SELECT COUNT(*) FROM packages");
    let total_size = scalar(conn, "SELECT COALESCE(SUM(size), 0) FROM packages");
    let category_count = scalar(conn, "SELECT COUNT(*) FROM categories");
    let format_count = scalar(conn, "SELECT COUNT(DISTINCT format) FROM packages");
    let added_this_month = scalar(
        conn,
        "SELECT COUNT(*) FROM packages WHERE strftime('%Y-%m', added_at) = strftime('%Y-%m', 'now', 'localtime')",
    );
    let added_last_month = scalar(
        conn,
        "SELECT COUNT(*) FROM packages WHERE strftime('%Y-%m', added_at) = strftime('%Y-%m', 'now', 'localtime', '-1 month')",
    );
    let installable_count = scalar(conn, "SELECT COUNT(*) FROM packages WHERE installable = 1");
    let favorite_count = scalar(conn, "SELECT COUNT(*) FROM packages WHERE favorite = 1");
    let duplicate_count = scalar(
        conn,
        "SELECT COALESCE(SUM(cnt - 1), 0) FROM (SELECT COUNT(*) cnt FROM packages GROUP BY file_name, size HAVING cnt > 1)",
    );
    let scan_dir_count = scalar(conn, "SELECT COUNT(*) FROM scan_dirs");
    let uncategorized_count = scalar(conn, "SELECT COUNT(*) FROM packages WHERE category_id IS NULL");

    let mut stmt = conn.prepare(
        "SELECT COALESCE(c.name, '未分类'), COALESCE(c.color, '#94a3b8'), COUNT(p.id), COALESCE(SUM(p.size), 0)
         FROM packages p LEFT JOIN categories c ON c.id = p.category_id
         GROUP BY p.category_id ORDER BY 4 DESC",
    )?;
    let by_category = stmt
        .query_map([], |r| {
            Ok(CategorySlice {
                name: r.get(0)?,
                color: r.get(1)?,
                count: r.get(2)?,
                size: r.get(3)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut stmt = conn.prepare(
        "SELECT format, COUNT(*), COALESCE(SUM(size), 0) FROM packages GROUP BY format ORDER BY 2 DESC, 3 DESC",
    )?;
    let by_format = stmt
        .query_map([], |r| {
            Ok(FormatSlice {
                format: r.get(0)?,
                count: r.get(1)?,
                size: r.get(2)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM packages p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.size DESC LIMIT 5",
        PKG_COLS
    ))?;
    let biggest = stmt
        .query_map([], row_to_package)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut stmt = conn.prepare(&format!(
        "SELECT {} FROM packages p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.id DESC LIMIT 6",
        PKG_COLS
    ))?;
    let recent_packages = stmt
        .query_map([], row_to_package)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let recent_activity = list_activities(conn, 8)?;

    Ok(DashboardStats {
        total_packages,
        total_size,
        category_count,
        format_count,
        added_this_month,
        added_last_month,
        installable_count,
        favorite_count,
        duplicate_count,
        scan_dir_count,
        uncategorized_count,
        by_category,
        by_format,
        biggest,
        recent_packages,
        recent_activity,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_schema(&conn).unwrap();
        conn
    }

    fn add_pkg(conn: &Connection, name: &str, file: &str, fmt: &str, size: i64, fav: bool) {
        let cat = fallback_category(conn);
        let ts = now();
        conn.execute(
            "INSERT INTO packages (name, file_name, path, version, category_id, format, size, arch,
                installable, favorite, launch_count, file_mtime, added_at, updated_at)
             VALUES (?1, ?2, ?3, '1.2.3', ?4, ?5, ?6, 'x64', 1, ?7, 0, 0, ?8, ?8)",
            params![name, file, format!("D:/pkgs/{}", file), cat, fmt, size, fav, ts],
        )
        .unwrap();
    }

    #[test]
    fn dashboard_and_queries_work() {
        let conn = setup();
        add_pkg(&conn, "Google Chrome", "chrome.exe", "EXE", 100 * 1024 * 1024, true);
        add_pkg(&conn, "Node.js", "node.msi", "MSI", 30 * 1024 * 1024, false);

        let d = dashboard(&conn).unwrap();
        assert_eq!(d.total_packages, 2);
        assert_eq!(d.total_size, 130 * 1024 * 1024);
        assert_eq!(d.format_count, 2);
        assert_eq!(d.added_this_month, 2);
        assert_eq!(d.favorite_count, 1);
        assert_eq!(d.by_format.len(), 2);
        assert_eq!(d.by_format[0].format, "EXE");
        assert_eq!(d.by_category.len(), 1);
        assert_eq!(d.by_category[0].count, 2);
        assert_eq!(d.biggest.len(), 2);
        assert_eq!(d.biggest[0].name, "Google Chrome");
        assert_eq!(d.recent_packages.len(), 2);
        assert!(d.category_count >= 10);

        // 关键词搜索
        let q = PackageQuery { search: Some("chrom".into()), ..Default::default() };
        assert_eq!(list_packages(&conn, &q).unwrap().len(), 1);
        let q = PackageQuery { search: Some("firefox".into()), ..Default::default() };
        assert_eq!(list_packages(&conn, &q).unwrap().len(), 0);

        // 格式 / 收藏 / 分类过滤 + 排序
        let q = PackageQuery { format: Some("MSI".into()), ..Default::default() };
        let list = list_packages(&conn, &q).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "Node.js");
        let q = PackageQuery { only_favorites: true, ..Default::default() };
        assert_eq!(list_packages(&conn, &q).unwrap().len(), 1);
        let q = PackageQuery { sort: Some("size".into()), ..Default::default() };
        let list = list_packages(&conn, &q).unwrap();
        assert_eq!(list[0].name, "Google Chrome");
        let q = PackageQuery { sort: Some("name".into()), ..Default::default() };
        assert_eq!(list_packages(&conn, &q).unwrap()[0].name, "Google Chrome");

        // 分类聚合
        let cats = list_categories(&conn).unwrap();
        let other = cats.iter().find(|c| c.name == "其他").unwrap();
        assert_eq!(other.package_count, 2);

        // 扫描目录统计
        conn.execute("INSERT INTO scan_dirs (path) VALUES ('D:/pkgs')", []).unwrap();
        let dirs = list_scan_dirs(&conn).unwrap();
        assert_eq!(dirs.len(), 1);
        assert_eq!(dirs[0].package_count, 2);
    }
}
