export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const unitIndex = Math.floor(Math.log10(bytes) / 3);
    const size = bytes / Math.pow(1000, unitIndex);
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}