"""生成演示用的安装包文件并写入 PkgHub 数据库（仅用于本地截图/体验）。

用法：
  1. 先运行一次 PkgHub，让它创建数据库（exe 目录下的 pkghub.db）
  2. python scripts/seed_demo.py
  3. 再打开 PkgHub 即可看到演示数据
"""
import os
import re
import sqlite3
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMO_DIR = os.path.join(ROOT, "demo_packages")

# 优先使用便携模式（exe 旁边）的数据库，其次旧版 AppData 路径
_CANDIDATES = [
    os.path.join(ROOT, "src-tauri", "target", "release", "pkghub.db"),
    os.path.join(os.environ.get("APPDATA", ""), "com.pkghub.desktop", "pkghub.db"),
]
DB = next((p for p in _CANDIDATES if p and os.path.exists(p)), _CANDIDATES[0])

MB = 1024 * 1024

# (软件名, 版本, 分类名, 格式, 体积MB, 架构, 天数前)
SEEDS = [
    ("Visual Studio Code", "1.85.1", "开发工具", "exe", 96, "x64", 12),
    ("Node.js LTS", "20.11.0", "开发工具", "msi", 30, "x64", 25),
    ("Python", "3.12.2", "开发工具", "exe", 26, "x64", 33),
    ("Git for Windows", "2.43.0", "开发工具", "exe", 58, "x64", 40),
    ("Docker Desktop", "4.27.2", "开发工具", "exe", 560, "x64", 8),
    ("OpenJDK", "17.0.10", "开发工具", "zip", 190, "x64", 55),
    ("MySQL Community Server", "8.0.36", "开发工具", "msi", 350, "x64", 61),
    ("Postman", "10.23.5", "开发工具", "exe", 130, "x64", 70),
    ("Navicat Premium", "16.3.4", "开发工具", "exe", 120, "x64", 88),
    ("IntelliJ IDEA Ultimate", "2023.3.4", "开发工具", "exe", 890, "x64", 95),
    ("Rust Toolchain", "1.76.0", "开发工具", "msi", 240, "x64", 110),
    ("Redis for Windows", "7.2.4", "开发工具", "zip", 12, "x64", 120),
    ("WPS Office", "12.1.0.16", "办公效率", "exe", 260, "x64", 3),
    ("Adobe Acrobat Reader", "2023.008", "办公效率", "exe", 210, "x64", 15),
    ("Notion", "3.12.0", "办公效率", "exe", 92, "x64", 20),
    ("Obsidian", "1.5.8", "办公效率", "exe", 78, "x64", 45),
    ("XMind", "2024", "办公效率", "exe", 180, "x64", 52),
    ("Typora", "1.8.5", "办公效率", "exe", 76, "x64", 66),
    ("Adobe Photoshop", "2024", "图形设计", "exe", 2400, "x64", 5),
    ("Adobe Illustrator", "2024", "图形设计", "exe", 1900, "x64", 6),
    ("Figma Desktop", "116.10", "图形设计", "exe", 88, "x64", 30),
    ("Blender", "4.0.2", "图形设计", "msi", 310, "x64", 72),
    ("AutoCAD", "2024", "图形设计", "exe", 2100, "x64", 130),
    ("SketchUp Pro", "2023", "图形设计", "exe", 620, "x64", 142),
    ("字体合集", "2024", "图形设计", "rar", 480, None, 160),
    ("VLC Media Player", "3.0.20", "影音媒体", "exe", 42, "x64", 10),
    ("PotPlayer", "1.7.22077", "影音媒体", "exe", 32, "x64", 18),
    ("OBS Studio", "30.0.2", "影音媒体", "exe", 145, "x64", 35),
    ("Adobe Premiere Pro", "2024", "影音媒体", "exe", 2600, "x64", 7),
    ("剪映专业版", "5.9.0", "影音媒体", "exe", 380, "x64", 22),
    ("Audacity", "3.4.2", "影音媒体", "exe", 40, "x64", 80),
    ("7-Zip", "23.01", "系统工具", "exe", 2, "x64", 2),
    ("WinRAR", "6.24", "系统工具", "exe", 4, "x64", 14),
    ("Everything", "1.4.1", "系统工具", "exe", 2, "x64", 28),
    ("驱动精灵", "12.0", "系统工具", "exe", 88, "x64", 48),
    ("DirectX 修复工具", "4.2", "系统工具", "exe", 65, "x64", 75),
    ("Windows Terminal", "1.19", "系统工具", "msix", 12, "x64", 58),
    ("便携工具箱", "2.1", "系统工具", "7z", 260, None, 96),
    ("火绒安全", "6.0", "安全防护", "exe", 62, "x64", 9),
    ("360 安全卫士", "14.0", "安全防护", "exe", 180, "x64", 60),
    ("Google Chrome", "120.0.6099.130", "网络浏览", "exe", 105, "x64", 1),
    ("Mozilla Firefox", "122.0", "网络浏览", "exe", 62, "x64", 26),
    ("Microsoft Edge", "121.0", "网络浏览", "exe", 150, "x64", 44),
    ("微信", "3.9.9.43", "通讯协作", "exe", 240, "x64", 4),
    ("钉钉", "7.5.0", "通讯协作", "exe", 320, "x64", 11),
    ("飞书", "6.9.8", "通讯协作", "exe", 280, "x64", 19),
    ("腾讯会议", "3.18.1", "通讯协作", "exe", 190, "x64", 37),
    ("Steam", "2024", "游戏娱乐", "exe", 3, "x64", 13),
    ("Unity Hub", "3.6.2", "游戏娱乐", "exe", 120, "x64", 58),
    ("Epic Games Launcher", "15.17", "游戏娱乐", "msi", 68, "x64", 90),
]

INSTALLABLE = {"exe", "msi", "msix", "appx", "msu", "pkg", "deb", "rpm", "appimage", "apk", "jar"}


def make_file(path: str, size: int) -> None:
    """创建稀疏文件，占用磁盘接近 0 但报告真实体积。"""
    if os.path.exists(path):
        return
    with open(path, "wb") as f:
        f.seek(max(0, size - 1))
        f.write(b"\0")


def main() -> None:
    if not os.path.exists(DB):
        sys.exit(f"数据库不存在：{DB}\n请先启动一次 PkgHub。")

    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM categories")
    cats = {name: cid for cid, name in cur.fetchall()}
    if not cats:
        sys.exit("数据库里还没有分类，请先启动一次 PkgHub。")

    now = time.strftime("%Y-%m-%d %H:%M:%S")
    created = []
    for name, version, cat, fmt, mb, arch, days in SEEDS:
        folder = os.path.join(DEMO_DIR, cat, fmt.upper())
        os.makedirs(folder, exist_ok=True)
        fname = f"{name.replace(' ', '_')}_{version}{'_' + arch if arch else ''}.{fmt}"
        path = os.path.join(folder, fname)
        size = int(mb * MB * (0.94 + (len(name) % 9) / 100))
        make_file(path, size)

        ts = time.time() - days * 86400
        added = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(ts))
        mtime = int(ts)
        cur.execute(
            """INSERT OR REPLACE INTO packages
               (name, file_name, path, version, category_id, format, size, arch, installable,
                favorite, notes, launch_count, last_launched_at, file_mtime, added_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                name,
                fname,
                path,
                version,
                cats.get(cat),
                fmt.upper(),
                size,
                arch,
                1 if fmt in INSTALLABLE else 0,
                1 if len(name) % 11 == 0 else 0,
                None,
                len(name) % 7,
                added if len(name) % 7 == 0 else None,
                mtime,
                added,
                now,
            ),
        )
        created.append(path)

    cur.execute("INSERT OR IGNORE INTO scan_dirs (path, enabled, last_scan_at) VALUES (?, 1, ?)", (DEMO_DIR, now))
    cur.execute(
        "INSERT INTO activities (kind, message, created_at) VALUES (?,?,?)",
        ("scan", f"扫描完成：新增 {len(created)} 个，更新 0 个，清理 0 个失效条目", now),
    )
    conn.commit()
    conn.close()
    print(f"已写入 {len(created)} 条演示数据")
    print(f"目录：{DEMO_DIR}")
    print(f"数据库：{DB}")


if __name__ == "__main__":
    main()
