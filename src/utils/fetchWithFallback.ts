// Lightweight fetch wrapper with domain fallback
// Priority rules:
// - If URL contains n8n.sistemavieira.com.br -> try it, then webhook.sistemavieira.com.br, then webhook.apivieiracred.store
// - If URL contains webhook.sistemavieira.com.br -> try it, then webhook.apivieiracred.store
// - If URL contains webhook.apivieiracred.store -> only try it

type FetchInput = RequestInfo | URL;

function safeParseUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {}
  // Tenta adicionar protocolo ausente
  try {
    return new URL(`https://${input}`);
  } catch {}
  // Corrige casos como "https:webhook.apivieiracred.storewebhookapiconsulta2"
  // Inserindo '//' após protocolo e '/' antes de 'webhook' path
  try {
    const m = input.match(/^(https?):([^/].*)$/i);
    if (m) {
      // força // após o protocolo
      let rest = m[2];
      // se não houver '/', separamos host do restante na primeira ocorrência de 'webhook'
      if (!rest.includes('/')) {
        const idx = rest.toLowerCase().indexOf('webhook');
        if (idx > -1) {
          const host = rest.slice(0, idx);
          const path = rest.slice(idx);
          rest = `${host.replace(/\/$/, '')}/${path.replace(/^\/*/, '')}`;
        }
      }
      // garante uma barra entre host e caminho
      const fixed = `${m[1]}://${rest.replace(/^([^/]+)(.+)$/, (_: string, host: string, path: string) => `${host.replace(/\/$/, '')}/${path.replace(/^\/*/, '')}`)}`;
      return new URL(fixed);
    }
  } catch {}
  // Última tentativa: inserir // após protocolo se faltar
  try {
    if (/^https?:[^/]/i.test(input)) {
      const fixed = input.replace(/^(https?):/, '$1://');
      return new URL(fixed);
    }
  } catch {}
  return null;
}

function buildAttempts(urlStr: string): string[] {
  const attempts: string[] = [];
  const N8N = 'n8n.sistemavieira.com.br';
  const WEBHOOK = 'webhook.sistemavieira.com.br';
  const STORE = 'n8n.apivieiracred.store';

  const u = safeParseUrl(urlStr);
  if (!u) return [urlStr];

  const pushHost = (host: string) => {
    const clone = new URL(u.toString());
    clone.hostname = host;
    // garante que pathname começa com '/'
    if (!clone.pathname.startsWith('/')) clone.pathname = '/' + clone.pathname;
    attempts.push(clone.toString());
  };

  if (u.hostname === N8N) {
    pushHost(N8N);
    pushHost(WEBHOOK);
    pushHost(STORE);
  } else if (u.hostname === WEBHOOK) {
    pushHost(WEBHOOK);
    pushHost(STORE);
  } else if (u.hostname === STORE) {
    pushHost(STORE);
  } else {
    attempts.push(u.toString());
  }

  // de-duplicate just in case
  return [...new Set(attempts)];
}

export default async function fetchWithFallback(input: FetchInput, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === 'string' ? input : input.toString();
  const attempts = buildAttempts(urlStr);
  let lastError: any = null;

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt, init);
      if (res.ok) return res;
      // Treat non-2xx as failure and try next
      lastError = new Error(`Request failed: ${res.status} ${res.statusText}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error('All fetch attempts failed');
}
