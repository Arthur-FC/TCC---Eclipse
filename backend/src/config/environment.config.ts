import Joi, { CustomHelpers } from 'joi';

const nodeEnvironments = ['development', 'test', 'production'] as const;

function validateCorsOrigins(value: string, helpers: CustomHelpers) {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    return helpers.error('any.invalid');
  }

  const allOriginsAreValid = origins.every((origin) => {
    try {
      const url = new URL(origin);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  });

  return allOriginsAreValid ? value : helpers.error('any.invalid');
}

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(...nodeEnvironments)
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65_535).default(3002),
  CORS_ORIGINS: Joi.string()
    .custom(validateCorsOrigins, 'CORS origins validation')
    .default('http://localhost:4200'),
  DATABASE_HOST: Joi.string().hostname().default('127.0.0.1'),
  DATABASE_PORT: Joi.number().integer().min(1).max(65_535).default(5432),
  DATABASE_NAME: Joi.string().pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/).default('eclipse'),
  DATABASE_USER: Joi.string().min(1).max(63).default('eclipse'),
  DATABASE_PASSWORD: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(16).required(),
    otherwise: Joi.string().min(8).default('eclipse_dev'),
  }),
  SESSION_TTL_DAYS: Joi.number().integer().min(1).max(30).default(7),
  GROQ_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(20).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  GROQ_MODEL: Joi.string().min(1).max(120).default('qwen/qwen3.6-27b'),
  GROQ_TIMEOUT_MS: Joi.number().integer().min(5_000).max(120_000).default(45_000),
  AI_MAX_COMPLETION_TOKENS: Joi.number().integer().min(128).max(16_384).default(1_500),
  AI_CONTEXT_MESSAGES: Joi.number().integer().min(1).max(100).default(20),
  AI_BRIEFING_MAX_ATTEMPTS: Joi.number().integer().min(1).max(3).default(2),
  AI_MAX_TOOL_CALLS: Joi.number().integer().min(1).max(10).default(4),
  YOUTUBE_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(20).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  YOUTUBE_TIMEOUT_MS: Joi.number().integer().min(3_000).max(60_000).default(15_000),
  YOUTUBE_CACHE_TTL_SECONDS: Joi.number().integer().min(300).max(604_800).default(86_400),
  YOUTUBE_RESULTS_LIMIT: Joi.number().integer().min(1).max(25).default(10),
  YOUTUBE_DAILY_SEARCH_LIMIT: Joi.number().integer().min(1).max(100).default(90),
  YOUTUBE_DAILY_GENERAL_LIMIT: Joi.number().integer().min(1).max(10_000).default(9_000),
  SPOTIFY_CLIENT_ID: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(10).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  SPOTIFY_CLIENT_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(10).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  SPOTIFY_MARKET: Joi.string().pattern(/^[A-Z]{2}$/).default('BR'),
  SPOTIFY_TIMEOUT_MS: Joi.number().integer().min(3_000).max(60_000).default(15_000),
  STORAGE_ENDPOINT: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://127.0.0.1:9000'),
  STORAGE_REGION: Joi.string().min(1).max(100).default('us-east-1'),
  STORAGE_BUCKET: Joi.string().pattern(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/).default('eclipse-audio'),
  STORAGE_ACCESS_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(8).required(),
    otherwise: Joi.string().min(3).default('eclipse_minio'),
  }),
  STORAGE_SECRET_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(16).required(),
    otherwise: Joi.string().min(8).default('eclipse_minio_dev'),
  }),
  STORAGE_FORCE_PATH_STYLE: Joi.boolean().default(true),
  STORAGE_SIGNED_URL_TTL_SECONDS: Joi.number().integer().min(60).max(3_600).default(900),
  AUDIO_MAX_FILE_SIZE_BYTES: Joi.number().integer().min(1_048_576).max(1_073_741_824).default(52_428_800),
  AUDIO_ANALYSIS_WORKER_ENABLED: Joi.boolean().default(true),
  AUDIO_ANALYSIS_POLL_INTERVAL_MS: Joi.number().integer().min(250).max(60_000).default(1_000),
}).unknown(true);

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
