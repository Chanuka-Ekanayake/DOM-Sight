import type { Message } from './types';

/** Send a typed message to the extension runtime (background) and await the reply. */
export function sendToRuntime<R = unknown>(message: Message): Promise<R> {
  return chrome.runtime.sendMessage(message) as Promise<R>;
}

/** Send a typed message to the content script in a specific tab and await the reply. */
export function sendToTab<R = unknown>(tabId: number, message: Message): Promise<R> {
  return chrome.tabs.sendMessage(tabId, message) as Promise<R>;
}

/** Register a typed message handler. Return a value (or Promise) to reply. */
export function onMessage(handler: (message: Message, sender: chrome.runtime.MessageSender) => unknown): void {
  chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    const result = handler(message, sender);
    if (result instanceof Promise) {
      result.then(sendResponse, (err) => sendResponse({ error: String(err) }));
      return true; // keep channel open for async reply
    }
    if (result !== undefined) sendResponse(result);
    return false;
  });
}
