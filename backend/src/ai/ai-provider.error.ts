export type AiProviderErrorCode =
  | 'not_configured'
  | 'rate_limited'
  | 'timeout'
  | 'unavailable'
  | 'invalid_response';

export type AiRateLimitType = 'RPM' | 'RPD' | 'TPM' | 'TPD' | 'ITPM' | 'OTPM';

export interface AiRateLimitDetails {
  type?: AiRateLimitType;
  limit?: number;
  requested?: number;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly code: AiProviderErrorCode,
    readonly retryAfterSeconds?: number,
    readonly rateLimit?: AiRateLimitDetails,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}

export function describeGroqRateLimit(error: AiProviderError): string {
  const details = error.rateLimit;
  if (details?.requested && details.limit && details.requested > details.limit) {
    return details.type === 'OTPM'
      ? 'A resposta solicitada excedeu o limite de saída da Groq. Tente novamente com uma resposta menor.'
      : 'A solicitação excedeu um limite de tokens da Groq. Reduza o conteúdo e tente novamente.';
  }
  if (details?.type === 'RPD' || details?.type === 'TPD') {
    return 'O limite diário da Groq foi atingido. Tente novamente após a renovação da cota.';
  }
  if (details?.type) {
    return `O limite por minuto da Groq foi atingido. Aguarde${error.retryAfterSeconds ? ` ${error.retryAfterSeconds} segundos` : ' um momento'} e tente novamente.`;
  }
  return 'A Groq limitou temporariamente as solicitações. Aguarde um momento e tente novamente.';
}
