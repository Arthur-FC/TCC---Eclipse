import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BriefingsModule } from '../briefings/briefings.module';
import { ProjectsModule } from '../projects/projects.module';
import { AiToolExecutionEntity } from './ai-tool-execution.entity';
import { AiToolsService } from './ai-tools.service';

@Module({
  imports: [
    ProjectsModule,
    BriefingsModule,
    TypeOrmModule.forFeature([AiToolExecutionEntity]),
  ],
  providers: [AiToolsService],
  exports: [AiToolsService],
})
export class AiToolsModule {}
