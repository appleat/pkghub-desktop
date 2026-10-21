# PkgHub · 本地安装包管理器

一个用 **Rust + Tauri 2 + React 18** 编写的本地安装包管理软件：扫描指定目录下的安装包，自动识别版本/架构并归类入库，提供仪表盘总览与一键启动安装程序。

> 当前版本：v1.0.0　|　数据库：SQLite（rusqlite bundled，免系统依赖）

---

## 一、功能

| 模块 | 说明 |
| --- | --- |
| 软件库 | 网格 / 列表双视图，展示体积、分类、版本、格式、架构；关键词搜索（名称/文件名/路径）、按分类 / 格式 / 收藏筛选、6 种排序 |
| 启动安装 | EXE 直接启动、MSI 调用 `msiexec /i`、MSIX/APPX 交给系统安装器；支持「管理员安装」（UAC 提权）；非安装类（ZIP/7Z/RAR/ISO 等）标记为「打开」 |
| 分类管理 | 内置 10 个分类（开发工具/办公效率/图形设计/影音媒体/系统工具/安全防护/网络浏览/通讯协作/游戏娱乐/其他），可自定义名称、颜色、图标、关键词；删除分类时其下软件自动转为“未分类”；支持一键自动归类 |
| 扫描入库 | 递归扫描指定目录，实时进度回显；自动解析版本号、架构、清洗软件名；扫描后自动清理磁盘上已不存在的条目 |
| 扫描选项 | 「包含压缩包」开关、扫描深度（2~16 层）、**跳过类型**——14 种格式逐个点按切换收录/忽略（如不要 JAR 就点灰 JAR）；设置持久化在数据库 `settings` 表，重启后仍生效 |
| 仪表盘 | 总数 / 总体积 / 分类与格式数 / 本月新增四张指标卡，格式分布环形图，分类占用空间条形图，最近入库、活动时间线、占用空间 TOP5、扫描目录状态 |
| 详情抽屉 | 完整元信息（版本、架构、大小、入库/文件时间、启动次数）、改分类、重命名、备注、收藏、移除（可移入回收站或仅移出库） |

**扫描识别的格式**：EXE、MSI、MSIX、APPX、MSU、PKG、DEB、RPM、APPIMAGE、APK、JAR（可安装）；ZIP、7Z、RAR、TAR、GZ、TGZ、XZ、ISO、DMG、CAB（压缩包/镜像）。

**扫描规则备忘**
- 跳过目录：`Windows`、`AppData`、`ProgramData`、`$RECYCLE.BIN`、`node_modules`、`.git` 等系统与缓存目录
- 忽略文件：卸载程序（`unins000.exe`、名称含 uninstall/卸载）、小于 40KB 的 EXE、`~$` 开头的临时文件
- 重复扫描同一目录只更新已有条目（以完整路径为唯一键），不会产生重复副本
- 版本号从文件名解析，识别 `1.2.3`、`120.0.6099.130`、`v20.11.0` 及 alpha/beta/rc 后缀
- 「跳过类型」仅对新扫描生效，已入库的条目不会被自动删除（可手动移出）

---

## 二、技术栈与目录结构

```
pkghub_desktop/
├── src/                        # 前端（React 18 + TypeScript + Vite 5）
│   ├── App.tsx                 # 布局、路由、全局状态、扫描编排
│   ├── pages/                  # Dashboard / Packages / Categories / Scanner
│   ├── components/             # Icon、PackageViews、PackageDrawer、charts、ui
│   └── lib/
│       ├── api.ts              # Tauri invoke 封装（非 Tauri 环境自动降级为演示数据）
│       ├── mock.ts             # 浏览器预览用的演示数据
│       ├── types.ts / format.ts
├── src-tauri/                  # Rust 后端
│   └── src/
│       ├── lib.rs              # 入口，注册 24 个命令
│       ├── db.rs               # 建表、种子分类、查询聚合（含单元测试）
│       ├── scanner.rs          # 目录扫描、版本解析、关键词归类、入库、失效清理（含单元测试）
│       ├── commands.rs         # Tauri 命令：查询/启动/删除/分类/扫描目录
│       ├── models.rs
│   └── tauri.conf.json         # 窗口与打包配置（NSIS）
├── scripts/
│   ├── gen_icons.py            # 纯标准库生成应用图标（PNG/ICO）
│   ├── seed_demo.py            # 生成演示数据
│   └── shot.ps1                # 桌面窗口截图脚本
├── screenshots/                # 界面截图
├── .cargo/config.toml          # crates.io 镜像配置（重要，见备忘）
└── dist/                       # 前端构建产物（release 构建时内嵌进 exe）
```

**数据存储**：默认生成在**程序（exe）所在目录**的 `pkghub.db`（便携模式，拷贝 exe 即可带走数据）；若该目录不可写（如安装在 Program Files），自动退回 `%APPDATA%\com.pkghub.desktop\pkghub.db`。表：`packages`、`categories`、`scan_dirs`、`activities`。

---

## 三、开发与构建

```bash
npm install            # 安装前端依赖（已含 @tauri-apps/cli）

npm run dev            # 仅前端，浏览器演示模式（http://127.0.0.1:1420）
npm run build          # 类型检查 + 前端构建到 dist/

npm run app:dev        # Tauri 开发模式（热重载，前后端一起跑）
npm run app:build      # 打包 NSIS 安装器

# 免 CLI 的快速路径：前端先 build，再直接编译（产物内嵌 dist，单文件可运行）
npm run build
cargo build --release  # 在 src-tauri/ 下执行，产物 target/release/pkghub.exe

cargo test             # Rust 单元测试（6 个用例）
```

---

## 四、环境备忘（重要）

1. **crates.io 直连不通**：本机访问 `index.crates.io` 超时，已在项目根 `.cargo/config.toml` 配置 [rsproxy.cn](https://rsproxy.cn) 稀疏镜像。换网络环境或不再需要时可删除该文件。
2. **Rust 版本锁定**：rustc 1.89 无法编译 tauri 2.12（要求 1.90），已锁定 `tauri = 2.11.2`、`tauri-build = 2.6.2`，并在 `Cargo.lock` 中降级了传递依赖（tauri-utils 2.9.2、tauri-codegen/macros 2.6.2、tauri-runtime(-wry) 2.11.2、wry 0.55.1、muda 0.19.3）。升级 rustc 到 1.90+ 后可放开版本限制。
3. **release 构建无需 tauri-cli**：`cargo build --release` 会把 `../dist` 内嵌进 exe；但 **debug 构建走 devUrl**（需要 `npm run dev` 在跑）。改完前端务必先 `npm run build` 再编译。
4. **窗口图标**：由 `scripts/gen_icons.py` 生成于 `src-tauri/icons/`，改动品牌视觉后重跑即可。
5. **删除文件走回收站**：通过 PowerShell 的 `Microsoft.VisualBasic.FileIO` 实现，不会直接物理删除。
6. **Windows 专用**：目录选择、提权启动、回收站均依赖 PowerShell/explorer，当前面向 Windows。

---

## 五、演示数据说明

- 数据库改为 exe 目录便携模式后，`%APPDATA%\com.pkghub.desktop\pkghub.db` 是早期版本的旧库（含 50 条演示数据），确认不需要后可手动删除整个 `com.pkghub.desktop` 文件夹。
- 演示文件目录 `demo_packages/` 为稀疏文件（逻辑体积约 17GB，实际磁盘占用≈0），不需要时可直接删除。
- 重新生成演示数据到当前库：先启动一次应用建库，再执行 `python scripts/seed_demo.py`（注意：该脚本目前写的是旧版 AppData 路径，便携模式下需把其中的 `DB` 常量改为 exe 目录下的 `pkghub.db`）。

## 六、待办 / 可扩展方向

- [ ] 批量操作（多选移出、批量改分类）
- [ ] 读取 PE 资源中的文件版本/产品名（替代纯文件名解析）
- [ ] 重复文件清理向导（仪表盘已统计 duplicate_count）
- [ ] 导出/导入软件库清单（CSV/JSON）
- [ ] 深色主题与窗口自定义标题栏
