import type { Message, Status } from './shared/types';
import { snapshotFileName } from './shared/filename';
import { abbreviate } from './shared/format';

const BADGE_COLOR: Record<Status, string> = { green: '#2ecc71', amber: '#f1c40f', red: '#e74c3c' };

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  switch (message.type) {
    case 'badge': {
      const tabId = sender.tab?.id;
      if (tabId === undefined) return false;
      const text = message.nodes === undefined ? '' : abbreviate(message.nodes);
      void chrome.action.setBadgeText({ tabId, text });
      void chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR[message.status] });
      void chrome.action.setBadgeTextColor?.({ tabId, color: '#000000' });
      sendResponse(true);
      return false;
    }
    case 'download-snapshot': {
      const json = JSON.stringify(message.snapshot, null, 2);
      const url = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
      chrome.downloads
        .download({ url, filename: snapshotFileName(message.snapshot.url, message.snapshot.timestamp), saveAs: false })
        .then((id) => sendResponse({ id }), (err) => sendResponse({ error: String(err) }));
      return true;
    }
    default:
      return false;
  }
});
