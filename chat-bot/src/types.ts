// ── Evolution API types ──

export interface EvolutionInstance {
  name: string;
  instance?: {
    instanceName?: string;
    status?: string;
  };
  connectionStatus?: string;
  ownerJid?: string;
  number?: string;
}

export interface InstanceInfo {
  name: string;
  status: string;
  owner: string;
}

export interface QRCodeData {
  base64?: string;
}

export interface MessageKey {
  id: string;
  remoteJid?: string;
  remoteJidAlt?: string;
  senderPn?: string;
  fromMe?: boolean;
}

export interface MessageRecord {
  key: MessageKey;
  senderPn?: string;
  messageTimestamp?: number;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    audioMessage?: object;
  };
}

export interface OllamaModel {
  name: string;
  size?: number;
  modified_at?: string;
}

export interface BotConfig {
  num: string;
  any: boolean;
  sys: string;
}

export interface BotState {
  on: boolean;
  vs: string[];
  seen: Set<string>;
  sent: Set<string>;
  sentTexts: Set<string>;
  hist: Map<string, ChatMessage[]>;
  self: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LogEntry {
  timestamp: string;
  instance: string;
  message: string;
}

export type ToastType = 'ok' | 'err' | '';

export interface ServerConfig {
  evolutionUrl: string;
  evolutionApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
  audioEnabled: boolean;
  whisperUrl: string;
  whisperModel: string;
  instances?: Record<string, {
    active: boolean;
    anyPerson: boolean;
    targetNum: string;
    sysPrompt: string;
  }>;
}

export interface BackendState {
  config: ServerConfig;
  activeBots: Record<string, boolean>;
  queueLength: number;
  logs: LogEntry[];
}
