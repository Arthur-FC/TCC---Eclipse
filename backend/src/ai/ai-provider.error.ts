export type AiProviderErrorCode =
  | 'not_configured'
  | 'rate_limited'
  | 'timeout'
  | 'unavailable'
  | 'invalid_response';

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly code: AiProviderErrorCode,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
