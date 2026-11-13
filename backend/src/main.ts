import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { configureApplication } from './bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  configureApplication(app, configService);

  if (configService.get<string>('NODE_ENV') === 'production') {
    const frontendPath = resolve(
      __dirname,
      '..',
      '..',
      'dist',
      'eclipse',
      'browser',
    );
    app.useStaticAssets(frontendPath, { index: 'index.html' });
    app.use((request: Request, response: Response, next: NextFunction) => {
      const isFrontendRoute =
        request.method === 'GET' &&
        !request.path.startsWith('/api') &&
        Boolean(request.accepts('html'));

      if (!isFrontendRoute) {
        next();
        return;
      }

      response.sendFile(resolve(frontendPath, 'index.html'));
    });
  }

  await app.listen(port, '0.0.0.0');

  const publicHostname = configService
    .get<string>('RENDER_EXTERNAL_HOSTNAME', '')
    .trim();
  const publicApiUrl = publicHostname
    ? `https://${publicHostname}/api`
    : `http://localhost:${port}/api`;

  Logger.log(`Eclipse API disponível em ${publicApiUrl}`, 'Bootstrap');
}

void bootstrap();
