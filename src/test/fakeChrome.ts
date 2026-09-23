type Listener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void;

export interface FakeChromeOptions {
  /** URL reported for the active tab by chrome.tabs.query. */
  tabUrl?: string;
  /** Replies returned by chrome.tabs.sendMessage, keyed by message type. */
  tabReplies?: Record<string, unknown>;
}

/** Minimal in-memory stand-in for the chrome.* APIs this extension uses. */
export function fakeChrome(options: FakeChromeOptions = {}) {
  const store: Record<string, unknown> = {};
  const listeners: Listener[] = [];
  const emit = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) =>
    listeners.forEach((l) => l(changes, 'sync'));
  const sync = {
    get: async (keys?: string | string[] | null) => {
      if (keys == null) return { ...store };
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => k in store).map((k) => [k, store[k]]));
    },
    set: async (items: Record<string, unknown>) => {
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
      for (const [k, v] of Object.entries(items)) {
        changes[k] = { oldValue: store[k], newValue: v };
        store[k] = v;
      }
      emit(changes);
    },
    remove: async (keys: string | string[]) => {
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
      for (const k of Array.isArray(keys) ? keys : [keys]) {
        changes[k] = { oldValue: store[k] };
        delete store[k];
      }
      emit(changes);
    },
  };
  const onChanged = {
    addListener: (l: Listener) => listeners.push(l),
    removeListener: (l: Listener) => listeners.splice(listeners.indexOf(l), 1),
  };
  const messages: unknown[] = [];
  let optionsPageOpened = 0;
  const runtime = {
    sendMessage: async (m: unknown) => {
      messages.push(m);
      return true;
    },
    onMessage: { addListener: () => {} },
    openOptionsPage: async () => void optionsPageOpened++,
  };

  const tabMessages: unknown[] = [];
  const tabs = {
    query: async () => (options.tabUrl === undefined ? [] : [{ id: 1, url: options.tabUrl }]),
    sendMessage: async (_tabId: number, m: { type: string }) => {
      tabMessages.push(m);
      const reply = options.tabReplies?.[m.type];
      if (reply === undefined) throw new Error('Could not establish connection.');
      return reply;
    },
  };

  return {
    chrome: { storage: { sync, onChanged }, runtime, tabs },
    store,
    listeners,
    messages,
    tabMessages,
    optionsPageOpened: () => optionsPageOpened,
  };
}
