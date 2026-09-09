import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { environmentValidationSchema } from './config/environment.config';
import { createTypeOrmOptions } from './database/typeorm-options';
import { HealthModule } from './health/health.module';
import { ProjectsModule } from './projects/projects.module';
import { AiModule } from './ai/ai.module';
import { BriefingsModule } from './briefings/briefings.module';
import { ReferencesModule } from './references/references.module';
import { LibraryModule } from './library/library.module';
import { MoodboardsModule } from './moodboards/moodboards.module';
import { FinalWorksModule } from './final-works/final-works.module';
import { PrivacyModule } from './privacy/privacy.module';
import { EvaluationModule } from './evaluation/evaluation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: false,
      validationSchema: environmentValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createTypeOrmOptions,
    }),
    HealthModule,
    AuthModule,
    ProjectsModule,
    AiModule,
    BriefingsModule,
    ReferencesModule,
    LibraryModule,
    MoodboardsModule,
    FinalWorksModule,
    PrivacyModule,
    EvaluationModule,
  ],
})
export class AppModule {}
