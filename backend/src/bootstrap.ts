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
  );

  app.setGlobalPrefix('api');
  app.use(helmet());
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
