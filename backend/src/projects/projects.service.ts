import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ConversationEntity } from './conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { PaginationDto } from './dto/pagination.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { MessageEntity } from './message.entity';
import { PaginatedResult } from './paginated-result.interface';
import { ProjectEntity } from './project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectsRepository: Repository<ProjectEntity>,
    @InjectRepository(ConversationEntity)
    private readonly conversationsRepository: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messagesRepository: Repository<MessageEntity>,
  ) {}

  async createProject(
    ownerId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsRepository.save(
      this.projectsRepository.create({
        ownerId,
        title: dto.title,
        description: dto.description || null,
        archivedAt: null,
      }),
    );
  }

  async listProjects(
    ownerId: string,
    query: ListProjectsDto,
  ): Promise<PaginatedResult<ProjectEntity>> {
    const [items, total] = await this.projectsRepository.findAndCount({
      where: {
        ownerId,
        ...(query.includeArchived === 'true' ? {} : { archivedAt: IsNull() }),
      },
      order: { updatedAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return this.paginate(items, total, query);
  }

  async getProject(ownerId: string, projectId: string): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findOneBy({
      id: projectId,
      ownerId,
    });
    if (!project) {
      throw new NotFoundException('Projeto não encontrado.');
    }
    return project;
  }

  async updateProject(
    ownerId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    const project = await this.getActiveProject(ownerId, projectId);
    if (dto.title !== undefined) project.title = dto.title;
    if (dto.description !== undefined) {
      project.description = dto.description || null;
    }
    return this.projectsRepository.save(project);
  }

  async archiveProject(ownerId: string, projectId: string): Promise<void> {
    const project = await this.getActiveProject(ownerId, projectId);
    project.archivedAt = new Date();
    await this.projectsRepository.save(project);
  }

  async createConversation(
    ownerId: string,
    projectId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationEntity> {
    await this.getActiveProject(ownerId, projectId);
    return this.conversationsRepository.save(
      this.conversationsRepository.create({
        projectId,
        title: dto.title || 'Nova conversa',
      }),
    );
  }

  async listConversations(
    ownerId: string,
    projectId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<ConversationEntity>> {
    await this.getProject(ownerId, projectId);
    const [items, total] = await this.conversationsRepository.findAndCount({
      where: { projectId },
      order: { updatedAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return this.paginate(items, total, query);
  }

  async createMessage(
    ownerId: string,
    projectId: string,
    conversationId: string,
    dto: CreateMessageDto,
  ): Promise<MessageEntity> {
    await this.getActiveConversation(ownerId, projectId, conversationId);
    const message = await this.messagesRepository.save(
      this.messagesRepository.create({
        conversationId,
        role: dto.role,
        content: dto.content,
      }),
    );
    await this.conversationsRepository.update(conversationId, {
      updatedAt: new Date(),
    });
    return message;
  }

  async listMessages(
    ownerId: string,
    projectId: string,
    conversationId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<MessageEntity>> {
    await this.getConversation(ownerId, projectId, conversationId);
    const [items, total] = await this.messagesRepository.findAndCount({
      where: { conversationId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return this.paginate(items, total, query);
  }

  private async getActiveProject(
    ownerId: string,
    projectId: string,
  ): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findOneBy({
      id: projectId,
      ownerId,
      archivedAt: IsNull(),
    });
    if (!project) {
      throw new NotFoundException('Projeto ativo não encontrado.');
    }
    return project;
  }

  private async getConversation(
    ownerId: string,
    projectId: string,
    conversationId: string,
  ): Promise<ConversationEntity> {
    await this.getProject(ownerId, projectId);
    const conversation = await this.conversationsRepository.findOneBy({
      id: conversationId,
      projectId,
    });
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada.');
    }
    return conversation;
  }

  private async getActiveConversation(
    ownerId: string,
    projectId: string,
    conversationId: string,
  ): Promise<ConversationEntity> {
    await this.getActiveProject(ownerId, projectId);
    const conversation = await this.conversationsRepository.findOneBy({
      id: conversationId,
      projectId,
    });
    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada.');
    }
    return conversation;
  }

  private paginate<T>(
    items: T[],
    total: number,
    query: PaginationDto,
  ): PaginatedResult<T> {
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
