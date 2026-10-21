import type {
  Activity,
  Category,
  CategoryInput,
  Dashboard,
  PackageQuery,
  Pkg,
  ScanDir,
  ScanProgress,
  ScanSettings,
  ScanSummary,
} from "./types";
import { mockInvoke, mockOnScanProgress } from "./mock";

/** 非 Tauri 环境（浏览器预览）下走演示数据 */
export const isDemo = typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window);

async function invokeCmd<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isDemo) return mockInvoke<T>(cmd, args);
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

export const api = {
  getDashboard: () => invokeCmd<Dashboard>("get_dashboard"),
  listPackages: (query: PackageQuery) => invokeCmd<Pkg[]>("list_packages", { query }),
  getPackageDetail: (id: number) => invokeCmd<Pkg>("get_package_detail", { id }),

  listCategories: () => invokeCmd<Category[]>("list_categories"),
  listScanDirs: () => invokeCmd<ScanDir[]>("list_scan_dirs"),
  listActivities: (limit = 20) => invokeCmd<Activity[]>("list_activities", { limit }),

  setPackageCategory: (id: number, categoryId: number | null) =>
    invokeCmd<Pkg>("set_package_category", { id, categoryId }),
  toggleFavorite: (id: number) => invokeCmd<boolean>("toggle_favorite", { id }),
  renamePackage: (id: number, name: string) => invokeCmd<Pkg>("rename_package", { id, name }),
  setPackageNotes: (id: number, notes: string) => invokeCmd<void>("set_package_notes", { id, notes }),

  launchPackage: (id: number, elevated = false) => invokeCmd<void>("launch_package", { id, elevated }),
  revealPackage: (id: number) => invokeCmd<void>("reveal_package", { id }),
  openFolder: (path: string) => invokeCmd<void>("open_folder", { path }),
  deletePackage: (id: number, deleteFile = false) =>
    invokeCmd<void>("delete_package", { id, deleteFile }),

  createCategory: (input: CategoryInput) => invokeCmd<Category[]>("create_category", { input }),
  updateCategory: (id: number, input: CategoryInput) =>
    invokeCmd<Category[]>("update_category", { id, input }),
  deleteCategory: (id: number) => invokeCmd<Category[]>("delete_category", { id }),
  reclassifyUncategorized: () => invokeCmd<number>("reclassify_uncategorized"),

  addScanDir: (path: string) => invokeCmd<ScanDir[]>("add_scan_dir", { path }),
  removeScanDir: (id: number) => invokeCmd<ScanDir[]>("remove_scan_dir", { id }),
  toggleScanDir: (id: number, enabled: boolean) =>
    invokeCmd<ScanDir[]>("toggle_scan_dir", { id, enabled }),
  pickFolder: () => invokeCmd<string | null>("pick_folder"),

  scanDirectories: (paths: string[]) => invokeCmd<ScanSummary>("scan_directories", { paths }),
  rescanAll: () => invokeCmd<ScanSummary>("rescan_all"),

  getScanSettings: () => invokeCmd<ScanSettings>("get_scan_settings"),
  setScanSettings: (settings: ScanSettings) => invokeCmd<void>("set_scan_settings", { settings }),
};

export async function onScanProgress(cb: (p: ScanProgress) => void): Promise<() => void> {
  if (isDemo) return mockOnScanProgress(cb);
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<ScanProgress>("scan-progress", (e) => cb(e.payload));
  return unlisten;
}

export function errorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return String(e);
}
