// Minimal in-memory stand-in for the extension APIs the content script touches, so the built
// content.js can run on a plain page (standalone demos, QA without installing the extension).
(function () {
  if (window.chrome && window.chrome.storage) return;
  const store = {};
  const listeners = [];
  const emit = (changes) => listeners.forEach((l) => l(changes, 'sync'));
  const sync = {
    get: async (keys) => {
      if (keys == null) return { ...store };
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => k in store).map((k) => [k, store[k]]));
    },
    set: async (items) => {
      const changes = {};
      for (const [k, v] of Object.entries(items)) { changes[k] = { oldValue: store[k], newValue: v }; store[k] = v; }
      emit(changes);
    },
    remove: async (keys) => {
      const changes = {};
      for (const k of Array.isArray(keys) ? keys : [keys]) { changes[k] = { oldValue: store[k] }; delete store[k]; }
      emit(changes);
    },
  };
  store['site:' + location.origin] = { enabled: true };
  window.chrome = Object.assign(window.chrome || {}, {
    storage: { sync, onChanged: { addListener: (l) => listeners.push(l), removeListener: (l) => listeners.splice(listeners.indexOf(l), 1) } },
    runtime: {
      sendMessage: async (m) => { window.__domTrackerLastMessage = m; return true; },
      onMessage: { addListener: () => {} },
    },
  });
})();
