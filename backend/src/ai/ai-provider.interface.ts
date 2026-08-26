export type AiMessageRole = 'system' | 'user' | 'assistant';

export interface AiChatMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiTokenUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface AiProviderChunk {
  content?: string;
  usage?: AiTokenUsage;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  streamChat(
    messages: AiChatMessage[],
    signal: AbortSignal,
  ): AsyncIterable<AiProviderChunk>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
