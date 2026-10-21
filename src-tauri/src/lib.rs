mod commands;
mod db;
mod models;
mod scanner;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 便携模式：数据库默认生成在程序（exe）所在目录；
            // 若该目录不可写（如安装在 Program Files），自动退回系统数据目录。
            let fallback_dir = app.path().app_data_dir().expect("无法获取应用数据目录");
            std::fs::create_dir_all(&fallback_dir).ok();

            let database = match std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|d| d.to_path_buf()))
                .map(|dir| db::Db::open(dir.join("pkghub.db")))
            {
                Some(Ok(db)) => db,
                _ => db::Db::open(fallback_dir.join("pkghub.db")).expect("数据库初始化失败"),
            };
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_dashboard,
            commands::list_packages,
            commands::get_package_detail,
            commands::list_categories,
            commands::list_scan_dirs,
            commands::list_activities,
            commands::set_package_category,
            commands::toggle_favorite,
            commands::rename_package,
            commands::set_package_notes,
            commands::launch_package,
            commands::reveal_package,
            commands::open_folder,
            commands::delete_package,
            commands::create_category,
            commands::update_category,
            commands::delete_category,
            commands::reclassify_uncategorized,
            commands::add_scan_dir,
            commands::remove_scan_dir,
            commands::toggle_scan_dir,
            commands::pick_folder,
            commands::scan_directories,
            commands::rescan_all,
            commands::get_scan_settings,
            commands::set_scan_settings
        ])
        .run(tauri::generate_context!())
        .expect("PkgHub 启动失败");
}
