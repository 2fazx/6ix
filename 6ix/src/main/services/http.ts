const DEFAULT_UA = '6IX-Launcher/0.1 (https://github.com/6ix-launcher)'

export async function jsonFetch<T>(url: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': DEFAULT_UA,
        Accept: 'application/json',
        ...(init?.headers ?? {})
      }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}