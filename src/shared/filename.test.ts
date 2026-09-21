import { snapshotFileName } from './filename';

describe('snapshotFileName', () => {
  it('builds a filesystem-safe name from host and timestamp', () => {
    const name = snapshotFileName('https://localhost:5001/leave/apply', '2026-09-21T10:15:30.123Z');
    expect(name).toBe('dom-tracker_localhost_5001_2026-09-21T10-15-30-123Z.json');
  });

  it('falls back to "page" when the url is not parseable', () => {
    const name = snapshotFileName('not a url', '2026-09-21T10:15:30.123Z');
    expect(name).toBe('dom-tracker_page_2026-09-21T10-15-30-123Z.json');
  });
});
