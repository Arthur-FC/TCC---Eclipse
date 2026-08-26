import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { SessionEntity } from '../auth/session.entity';
import { UserEntity } from '../users/user.entity';
import { InitialAuthSchema1756152000000 } from './migrations/1756152000000-initial-auth-schema';

export function createTypeOrmOptions(
  configService: ConfigService,
): TypeOrmModuleOptions {
  return {
    ...createDataSourceOptions(configService),
    autoLoadEntities: true,
  };
}

export function createDataSourceOptions(
  configService: ConfigService,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: configService.getOrThrow<string>('DATABASE_HOST'),
    port: configService.getOrThrow<number>('DATABASE_PORT'),
    database: configService.getOrThrow<string>('DATABASE_NAME'),
    username: configService.getOrThrow<string>('DATABASE_USER'),
    password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
    entities: [UserEntity, SessionEntity],
    migrations: [InitialAuthSchema1756152000000],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
    logging: false,
    applicationName: 'eclipse-api',
    ssl:
      configService.get<string>('NODE_ENV') === 'production'
        ? { rejectUnauthorized: true }
        : false,
  };
}
