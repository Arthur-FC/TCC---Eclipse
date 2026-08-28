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
import { MessageRole } from './message-role.enum';
import { PaginatedResult } from './paginated-result.interface';
import { ProjectEntity } from './project.entity';

export interface AssistantMessageMetadata {
  provider: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
}

export interface ProjectMessageSearchResult {
  messageId: string;
  conversationId: string;
  role: MessageRole;
  excerpt: string;
  createdAt: Date;
}

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
    return this.persistMessage(
      ownerId,
      projectId,
      conversationId,
      dto.role,
      dto.content,
    );
  }

  async createAssistantMessage(
    ownerId: string,
    projectId: string,
    conversationId: string,
    content: string,
    metadata: AssistantMessageMetadata,
  ): Promise<MessageEntity> {
    return this.persistMessage(
      ownerId,
      projectId,
      conversationId,
      MessageRole.ASSISTANT,
      content,
      metadata,
    );
  }

  async getConversationContext(
    ownerId: string,
    projectId: string,
    conversationId: string,
    limit: number,
  ): Promise<MessageEntity[]> {
    await this.getActiveConversation(ownerId, projectId, conversationId);
    const messages = await this.messagesRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: limit,
    });
    return messages.reverse();
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

  async getProjectSummary(
    ownerId: string,
    projectId: string,
  ): Promise<{
    id: string;
    title: string;
    description: string | null;
    conversationCount: number;
    messageCount: number;
  }> {
    const project = await this.getProject(ownerId, projectId);
    const [conversationCount, messageCount] = await Promise.all([
      this.conversationsRepository.countBy({ projectId }),
      this.messagesRepository
        .createQueryBuilder('message')
        .innerJoin('message.conversation', 'conversation')
        .where('conversation.project_id = :projectId', { projectId })
        .getCount(),
    ]);
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      conversationCount,
      messageCount,
    };
  }

  async searchProjectMessages(
    ownerId: string,
    projectId: string,
    query: string,
    limit: number,
  ): Promise<ProjectMessageSearchResult[]> {
    await this.getProject(ownerId, projectId);
    const messages = await this.messagesRepository
      .createQueryBuilder('message')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.project_id = :projectId', { projectId })
      .andWhere('message.content ILIKE :pattern', { pattern: `%${query}%` })
      .orderBy('message.created_at', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(limit)
      .getMany();

    return messages.map((message) => ({
      messageId: message.id,
      conversationId: message.conversationId,
      role: message.role,
      excerpt:
        message.content.length <= 280
          ? message.content
          : `${message.content.slice(0, 277)}...`,
      createdAt: message.createdAt,
    }));
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

  private async persistMessage(
    ownerId: string,
    projectId: string,
    conversationId: string,
    role: MessageRole,
    content: string,
    metadata?: AssistantMessageMetadata,
  ): Promise<MessageEntity> {
    await this.getActiveConversation(ownerId, projectId, conversationId);
    const message = await this.messagesRepository.save(
      this.messagesRepository.create({
        conversationId,
        role,
        content,
        aiProvider: metadata?.provider ?? null,
        aiModel: metadata?.model ?? null,
        promptTokens: metadata?.promptTokens ?? null,
        completionTokens: metadata?.completionTokens ?? null,
        aiLatencyMs: metadata?.latencyMs ?? null,
      }),
    );
    const updatedAt = new Date();
    await Promise.all([
      this.conversationsRepository.update(conversationId, { updatedAt }),
      this.projectsRepository.update(projectId, { updatedAt }),
    ]);
    return message;
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
