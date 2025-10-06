// Tenta a URL principal; se falhar, tenta no host n8n.apivieiracred.store

function normalizeUrl(input: string): URL | null {
  try { return new URL(input); } catch {}
  try { return new URL(`https://${input}`); } catch {}
  // Corrige formatos como "https:hostpath" sem // e /
  const m = input.match(/^(https?):([^/].*)$/i);
  if (m) {
    let rest = m[2];
    if (!rest.includes('/')) {
      // separa host de path quando colados (ex.: n8n.dominiowebhookapi...)
      const ix = rest.toLowerCase().indexOf('webhook');
      if (ix > -1) {
        const host = rest.slice(0, ix);
        const path = rest.slice(ix);
        rest = `${host}/${path}`;
      }
    }
    try { return new URL(`${m[1]}://${rest}`); } catch {}
  }
  return null;
}

function toN8nStore(urlStr: string): string {
  const u = normalizeUrl(urlStr);
  if (u) {
    const primary = u.toString();
    u.hostname = 'n8n.apivieiracred.store';
    if (!u.pathname.startsWith('/')) u.pathname = '/' + u.pathname;
    const secondary = u.toString();
    // Evita retornar a mesma URL
    if (secondary === primary) return secondary + '';
    return secondary;
  }
  try {
    const u2 = new URL(urlStr);
    u2.hostname = 'n8n.apivieiracred.store';
    if (!u2.pathname.startsWith('/')) u2.pathname = '/' + u2.pathname;
    return u2.toString();
  } catch {
    // Se não for URL absoluta, assume caminho e prefixa com host
    const path = urlStr.startsWith('/') ? urlStr : '/' + urlStr;
    return `https://n8n.apivieiracred.store${path}`;
  }
}

export default async function fetchOrN8nStore(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const raw = typeof input === 'string' ? input : input.toString();
  const norm = normalizeUrl(raw);
  const primary = norm ? norm.toString() : raw;
  try {
    const res = await fetch(primary, init);
    if (res.ok) return res;
    // Fallback apenas quando status 500
    if (res.status !== 500) {
      return res;
    }
  } catch {
    // erro de rede, cai para fallback
  }
  const secondary = toN8nStore(primary);
  if (secondary === primary) {
    // já é o host de fallback, não repetir
    return await fetch(primary, init);
  }
  const res2 = await fetch(secondary, init);
  return res2;
}
