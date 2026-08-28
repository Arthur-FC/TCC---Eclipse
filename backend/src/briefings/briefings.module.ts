import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { ProjectEntity } from '../projects/project.entity';
import { ProjectsModule } from '../projects/projects.module';
import { BriefingEntity } from './briefing.entity';
import { BriefingsController } from './briefings.controller';
import { BriefingsService } from './briefings.service';

@Module({
  imports: [
    AuthModule,
    AiModule,
    ProjectsModule,
    TypeOrmModule.forFeature([BriefingEntity, ProjectEntity]),
  ],
  controllers: [BriefingsController],
  providers: [BriefingsService],
  exports: [BriefingsService],
})
export class BriefingsModule {}
