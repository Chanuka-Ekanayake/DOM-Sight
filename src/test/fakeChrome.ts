type Listener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void;

/** Minimal in-memory stand-in for chrome.storage.sync, onChanged and runtime.sendMessage. */
export function fakeChrome() {
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
  const runtime = {
    sendMessage: async (m: unknown) => {
      messages.push(m);
      return true;
    },
    onMessage: { addListener: () => {} },
  };
  return { chrome: { storage: { sync, onChanged }, runtime }, store, listeners, messages };
}
