// localStorage that never throws (private mode, blocked storage, etc.)
export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem("as:" + key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("as:" + key, JSON.stringify(value)); } catch {}
  },
};
