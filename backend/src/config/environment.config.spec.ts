import {
  environmentValidationSchema,
  parseCorsOrigins,
} from './environment.config';

describe('environment configuration', () => {
  it('applies safe development defaults', () => {
    const { error, value } = environmentValidationSchema.validate({});

    expect(error).toBeUndefined();
    expect(value).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3002,
      CORS_ORIGINS: 'http://localhost:4200',
      DATABASE_HOST: '127.0.0.1',
      DATABASE_PORT: 5432,
      DATABASE_NAME: 'eclipse',
      DATABASE_USER: 'eclipse',
      DATABASE_PASSWORD: 'eclipse_dev',
      SESSION_TTL_DAYS: 7,
      GROQ_API_KEY: '',
      GROQ_MODEL: 'qwen/qwen3.6-27b',
      GROQ_TIMEOUT_MS: 45_000,
      AI_MAX_COMPLETION_TOKENS: 1_500,
      AI_CONTEXT_MESSAGES: 20,
    });
  });

  it('requires a stronger database password in production', () => {
    const result = environmentValidationSchema.validate({
      NODE_ENV: 'production',
      DATABASE_PASSWORD: 'curta',
    });

    expect(result.error?.message).toContain('DATABASE_PASSWORD');
  });

  it('requires a Groq API key in production', () => {
    const result = environmentValidationSchema.validate({
      NODE_ENV: 'production',
      DATABASE_PASSWORD: 'senha-de-producao-segura',
    });

    expect(result.error?.message).toContain('GROQ_API_KEY');
  });

  it('rejects invalid ports and CORS origins', () => {
    const result = environmentValidationSchema.validate(
      {
        PORT: 70_000,
        CORS_ORIGINS: 'not-a-url',
      },
      { abortEarly: false },
    );

    expect(result.error?.details).toHaveLength(2);
  });

  it('parses multiple comma-separated origins', () => {
    expect(
      parseCorsOrigins('http://localhost:4200, https://eclipse.example'),
    ).toEqual(['http://localhost:4200', 'https://eclipse.example']);
  });
});
