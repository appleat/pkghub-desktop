export interface Pkg {
  id: number;
  name: string;
  fileName: string;
  path: string;
  version: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  format: string;
  size: number;
  arch: string | null;
  installable: boolean;
  favorite: boolean;
  notes: string | null;
  launchCount: number;
  lastLaunchedAt: string | null;
  fileMtime: number;
  addedAt: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  keywords: string;
  builtin: boolean;
  sortOrder: number;
  packageCount: number;
  totalSize: number;
}

export interface ScanDir {
  id: number;
  path: string;
  enabled: boolean;
  lastScanAt: string | null;
  packageCount: number;
}

export interface Activity {
  id: number;
  kind: string;
  message: string;
  createdAt: string;
}

export interface CategorySlice {
  name: string;
  color: string;
  count: number;
  size: number;
}

export interface FormatSlice {
  format: string;
  count: number;
  size: number;
}

export interface Dashboard {
  totalPackages: number;
  totalSize: number;
  categoryCount: number;
  formatCount: number;
  addedThisMonth: number;
  addedLastMonth: number;
  installableCount: number;
  favoriteCount: number;
  duplicateCount: number;
  scanDirCount: number;
  uncategorizedCount: number;
  byCategory: CategorySlice[];
  byFormat: FormatSlice[];
  biggest: Pkg[];
  recentPackages: Pkg[];
  recentActivity: Activity[];
}

export interface PackageQuery {
  search?: string;
  categoryId?: number | null;
  format?: string | null;
  sort?: string;
  onlyFavorites?: boolean;
  installableOnly?: boolean;
}

export interface ScanProgress {
  root: string;
  scanned: number;
  found: number;
  current: string;
}

export interface ScanSettings {
  includeArchives: boolean;
  maxDepth: number;
  /** 扫描时直接忽略的格式（大写，如 JAR、DMG） */
  skipFormats: string[];
}

export interface ScanSummary {
  added: number;
  updated: number;
  skipped: number;
  removed: number;
  scannedFiles: number;
  totalSize: number;
  durationMs: number;
  roots: string[];
}

export interface CategoryInput {
  name: string;
  color?: string;
  icon?: string;
  keywords?: string;
}

export type PageKey = "dashboard" | "packages" | "categories" | "scanner";
