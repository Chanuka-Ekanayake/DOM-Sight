/** `dom-tracker_<host>_<timestamp>.json`, safe for every filesystem. */
export function snapshotFileName(url: string, timestamp: string): string {
  let host = 'page';
  try {
    host = new URL(url).host.replace(/[^a-z0-9.-]/gi, '_');
  } catch {
    /* keep fallback */
  }
  const stamp = timestamp.replace(/[:.]/g, '-');
  return `dom-tracker_${host}_${stamp}.json`;
}
