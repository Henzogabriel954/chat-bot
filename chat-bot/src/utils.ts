// ── Local storage helper ──

export const store = {
  get: (key: string): string => {
    try {
      return localStorage.getItem(key) || '';
    } catch {
      return '';
    }
  },
  set: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
};

// ── BR phone number variants ──
// Adds country code 55 if missing, and tests with/without the 9th digit
export function brVariants(n: string): string[] {
  let num = String(n || '').replace(/\D/g, '');
  if (!num) return [];
  if (num.length <= 11) num = '55' + num;
  const v = [num];
  if (/^55\d{2}9\d{8}$/.test(num)) {
    v.push(num.slice(0, 4) + num.slice(5));
  } else if (/^55\d{2}[2-8]\d{7}$/.test(num)) {
    v.push(num.slice(0, 4) + '9' + num.slice(4));
  }
  return v;
}

// ── Extract digits from a JID ──
export function digits(jid: string): string {
  return String(jid || '').split('@')[0].replace(/\D/g, '');
}

// ── Extract text from a message record ──
export function msgText(r: { message?: { conversation?: string; extendedTextMessage?: { text?: string } } }): string {
  const m = r.message || {};
  return (m.conversation || m.extendedTextMessage?.text || '').trim();
}

// ── Format timestamp ──
export function timeStr(): string {
  return new Date().toLocaleTimeString('pt-BR');
}

// ── Escape HTML entities ──
export function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

// ── Default system prompt ──
export const DEFAULT_SYSTEM_PROMPT =
  'Você é um assistente prestativo. Responda em português do Brasil, de forma curta e clara.';
