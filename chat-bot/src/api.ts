// ── Backend API Client ──

import type { InstanceInfo, QRCodeData, ServerConfig, BackendState } from './types';

const API_BASE = '/api';

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(API_BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let d: T | null = null;
  try {
    d = await r.json();
  } catch {
    d = null;
  }

  if (!r.ok) {
    const err = d as Record<string, unknown> | null;
    const msg =
      (err && ((err.error as string) || (err.message as string))) ||
      'Erro HTTP ' + r.status;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return d as T;
}

export async function fetchState(): Promise<BackendState> {
  return request<BackendState>('/state');
}

export async function updateConfig(cfg: Partial<ServerConfig>): Promise<ServerConfig> {
  return request<ServerConfig>('/config', 'POST', cfg);
}

export async function fetchOllamaModels(): Promise<string[]> {
  const res = await request<{ models: string[] }>('/ollama/models');
  return res.models || [];
}

export async function fetchInstances(): Promise<InstanceInfo[]> {
  return request<InstanceInfo[]>('/instances');
}

export async function createInstance(name: string): Promise<{ qrcode?: QRCodeData }> {
  return request('/instances', 'POST', { name });
}

export async function connectInstance(name: string): Promise<{ state?: string; base64?: string } & QRCodeData> {
  return request('/instances/' + encodeURIComponent(name) + '/connect');
}

export async function logoutInstance(name: string): Promise<void> {
  await request('/instances/' + encodeURIComponent(name) + '/logout', 'POST');
}

export async function deleteInstance(name: string): Promise<void> {
  await request('/instances/' + encodeURIComponent(name), 'DELETE');
}

export async function sendText(instance: string, number: string, text: string): Promise<Record<string, unknown>> {
  return request('/instances/' + encodeURIComponent(instance) + '/send', 'POST', { number, text });
}

export async function updateBot(
  name: string,
  params: { active?: boolean; anyPerson?: boolean; targetNum?: string; sysPrompt?: string; toggle?: boolean }
): Promise<{ config: unknown; isActive: boolean }> {
  return request('/instances/' + encodeURIComponent(name) + '/bot', 'POST', params);
}

export async function diagnose(name: string): Promise<void> {
  await request('/instances/' + encodeURIComponent(name) + '/diagnose', 'POST');
}

export async function clearLogs(): Promise<void> {
  await request('/logs', 'DELETE');
}
