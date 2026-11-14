import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { parseCorsOrigins } from './config/environment.config';
import { createRequestSecurityMiddleware, PostgresRateLimitStore } from './common/security/request-security';

export function configureApplication(
  app: NestExpressApplication,
  configService: ConfigService,
): void {
  const corsOrigins = parseCorsOrigins(
    configService.get<string>('CORS_ORIGINS', 'http://localhost:4200'),
    configService.get<string>('RENDER_EXTERNAL_HOSTNAME', ''),
  );
  const storageOrigin = new URL(
    configService.get<string>('STORAGE_ENDPOINT', 'http://127.0.0.1:9000'),
  ).origin;

  app.setGlobalPrefix('api');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'connect-src': ["'self'", storageOrigin],
        'img-src': [
          "'self'",
          'data:',
          'https://i.ytimg.com',
          'https://*.ytimg.com',
          'https://i.scdn.co',
        ],
        'media-src': ["'self'", 'blob:', storageOrigin],
      },
    },
  }));
  app.use(cookieParser());
  app.use(createRequestSecurityMiddleware(configService, new PostgresRateLimitStore(app.get(DataSource))));
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  app.useLogger(new Logger());
}
