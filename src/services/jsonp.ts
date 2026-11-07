let seq = 0;

/** Minimal JSONP for APIs (like iTunes Search) that support `callback=` but not CORS. */
export function jsonp<T>(url: string, timeoutMs = 9000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const name = `__twp_jsonp_${Date.now().toString(36)}_${seq++}`;
    const script = document.createElement('script');
    const w = window as unknown as Record<string, unknown>;
    const cleanup = () => {
      clearTimeout(timer);
      delete w[name];
      script.remove();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('timeout'));
    }, timeoutMs);
    w[name] = (data: T) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('network'));
    };
    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${name}`;
    document.head.appendChild(script);
  });
}
