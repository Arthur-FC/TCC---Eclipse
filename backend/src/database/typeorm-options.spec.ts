import { ConfigService } from '@nestjs/config';
import { createDataSourceOptions } from './typeorm-options';

describe('TypeORM options', () => {
  it('uses DATABASE_URL when Neon provides a complete connection string', () => {
    const databaseUrl =
      'postgresql://eclipse:senha@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require';
    const options = createDataSourceOptions(
      new ConfigService({
        NODE_ENV: 'production',
        DATABASE_URL: databaseUrl,
      }),
    );

    expect(options).toMatchObject({
      type: 'postgres',
      url: databaseUrl,
      ssl: { rejectUnauthorized: true },
    });
    expect(options).not.toHaveProperty('password');
  });

  it('keeps separate connection fields for local development', () => {
    const options = createDataSourceOptions(
      new ConfigService({
        NODE_ENV: 'development',
        DATABASE_URL: '',
        DATABASE_HOST: '127.0.0.1',
        DATABASE_PORT: 5432,
        DATABASE_NAME: 'eclipse',
        DATABASE_USER: 'eclipse',
        DATABASE_PASSWORD: 'senha-local-segura',
      }),
    );

    expect(options).toMatchObject({
      type: 'postgres',
      host: '127.0.0.1',
      port: 5432,
      database: 'eclipse',
      username: 'eclipse',
      password: 'senha-local-segura',
      ssl: false,
    });
    expect(options).not.toHaveProperty('url');
  });
});
