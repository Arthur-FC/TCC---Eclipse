import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProjectEntity } from '../projects/project.entity';
import { EvaluationController } from './evaluation.controller';
import { EvaluationResponseEntity } from './evaluation-response.entity';
import { EvaluationService } from './evaluation.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([EvaluationResponseEntity, ProjectEntity])],
  controllers: [EvaluationController],
  providers: [EvaluationService],
})
export class EvaluationModule {}
