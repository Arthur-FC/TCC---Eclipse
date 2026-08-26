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
      PORT: 3001,
      CORS_ORIGINS: 'http://localhost:4200',
      DATABASE_HOST: '127.0.0.1',
      DATABASE_PORT: 5432,
      DATABASE_NAME: 'eclipse',
      DATABASE_USER: 'eclipse',
      DATABASE_PASSWORD: 'eclipse_dev',
      SESSION_TTL_DAYS: 7,
    });
  });

  it('requires a stronger database password in production', () => {
    const result = environmentValidationSchema.validate({
      NODE_ENV: 'production',
      DATABASE_PASSWORD: 'curta',
    });

    expect(result.error?.message).toContain('DATABASE_PASSWORD');
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
