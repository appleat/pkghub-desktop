use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Package {
    pub id: i64,
    pub name: String,
    pub file_name: String,
    pub path: String,
    pub version: Option<String>,
    pub category_id: Option<i64>,
    pub category_name: Option<String>,
    pub category_color: Option<String>,
    pub format: String,
    pub size: i64,
    pub arch: Option<String>,
    pub installable: bool,
    pub favorite: bool,
    pub notes: Option<String>,
    pub launch_count: i64,
    pub last_launched_at: Option<String>,
    pub file_mtime: i64,
    pub added_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub icon: String,
    pub keywords: String,
    pub builtin: bool,
    pub sort_order: i64,
    pub package_count: i64,
    pub total_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanDir {
    pub id: i64,
    pub path: String,
    pub enabled: bool,
    pub last_scan_at: Option<String>,
    pub package_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub id: i64,
    pub kind: String,
    pub message: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PackageQuery {
    pub search: Option<String>,
    pub category_id: Option<i64>,
    pub format: Option<String>,
    pub sort: Option<String>,
    pub only_favorites: bool,
    pub installable_only: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorySlice {
    pub name: String,
    pub color: String,
    pub count: i64,
    pub size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormatSlice {
    pub format: String,
    pub count: i64,
    pub size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub total_packages: i64,
    pub total_size: i64,
    pub category_count: i64,
    pub format_count: i64,
    pub added_this_month: i64,
    pub added_last_month: i64,
    pub installable_count: i64,
    pub favorite_count: i64,
    pub duplicate_count: i64,
    pub scan_dir_count: i64,
    pub uncategorized_count: i64,
    pub by_category: Vec<CategorySlice>,
    pub by_format: Vec<FormatSlice>,
    pub biggest: Vec<Package>,
    pub recent_packages: Vec<Package>,
    pub recent_activity: Vec<Activity>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub root: String,
    pub scanned: usize,
    pub found: usize,
    pub current: String,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanSummary {
    pub added: i64,
    pub updated: i64,
    pub skipped: i64,
    pub removed: i64,
    pub scanned_files: i64,
    pub total_size: i64,
    pub duration_ms: i64,
    pub roots: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryInput {
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub keywords: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ScanSettings {
    pub include_archives: bool,
    pub max_depth: usize,
    /// 扫描时直接忽略的格式标签（大写，如 JAR、DMG）
    pub skip_formats: Vec<String>,
}

impl Default for ScanSettings {
    fn default() -> Self {
        ScanSettings {
            include_archives: true,
            max_depth: 8,
            skip_formats: Vec::new(),
        }
    }
}
