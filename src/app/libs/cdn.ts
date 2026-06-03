const CDN_BASE_URL = process.env.CDN_BASE_URL || "";

export function getCDNUrl(path: string): string {
  if (!CDN_BASE_URL) return path;
  const base = CDN_BASE_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function isCDNEnabled(): boolean {
  return CDN_BASE_URL.length > 0;
}

export function getPublicId(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const file = parts[parts.length - 1];
  const dotIndex = file.lastIndexOf(".");
  return dotIndex > 0 ? file.substring(0, dotIndex) : file;
}
