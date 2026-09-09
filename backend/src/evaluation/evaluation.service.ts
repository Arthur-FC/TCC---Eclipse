import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../projects/project.entity';
import { SaveEvaluationDto } from './dto/save-evaluation.dto';
import { EvaluationResponseEntity } from './evaluation-response.entity';

export interface EvaluationResponse {
  id: string;
  projectId: string;
  referenceRelevance: number;
  moodboardUtility: number;
  reuseIntent: number;
  comments: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(EvaluationResponseEntity) private readonly responses: Repository<EvaluationResponseEntity>,
    @InjectRepository(ProjectEntity) private readonly projects: Repository<ProjectEntity>,
  ) {}

  async get(ownerId: string, projectId: string): Promise<EvaluationResponse | null> {
    await this.requireProject(ownerId, projectId);
    const response = await this.responses.findOneBy({ ownerId, projectId });
    return response ? this.toResponse(response) : null;
  }

  async save(ownerId: string, projectId: string, dto: SaveEvaluationDto): Promise<EvaluationResponse> {
    await this.requireProject(ownerId, projectId);
    const existing = await this.responses.findOneBy({ ownerId, projectId });
    const entity = this.responses.create({
      ...existing,
      ownerId,
      projectId,
      referenceRelevance: dto.referenceRelevance,
      moodboardUtility: dto.moodboardUtility,
      reuseIntent: dto.reuseIntent,
      comments: dto.comments?.trim() || null,
    });
    return this.toResponse(await this.responses.save(entity));
  }

  private async requireProject(ownerId: string, projectId: string): Promise<void> {
    if (!(await this.projects.existsBy({ id: projectId, ownerId }))) {
      throw new NotFoundException('Projeto não encontrado.');
    }
  }

  private toResponse(entity: EvaluationResponseEntity): EvaluationResponse {
    return {
      id: entity.id,
      projectId: entity.projectId,
      referenceRelevance: entity.referenceRelevance,
      moodboardUtility: entity.moodboardUtility,
      reuseIntent: entity.reuseIntent,
      comments: entity.comments,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
