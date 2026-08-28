export type AiMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AiToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface AiToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AiChatMessage {
  role: AiMessageRole;
  content: string | null;
  toolCalls?: AiToolCall[];
  toolCallId?: string;
  name?: string;
}

export interface AiTokenUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface AiProviderChunk {
  content?: string;
  usage?: AiTokenUsage;
  toolCalls?: AiToolCall[];
}

export interface AiProviderResponse {
  content: string;
  usage?: AiTokenUsage;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  streamChat(
    messages: AiChatMessage[],
    signal: AbortSignal,
    tools?: AiToolDefinition[],
  ): AsyncIterable<AiProviderChunk>;
  generateJson?(
    messages: AiChatMessage[],
    signal: AbortSignal,
  ): Promise<AiProviderResponse>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
