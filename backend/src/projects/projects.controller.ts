import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
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
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(SessionAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  createProject(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.createProject(user.id, dto);
  }

  @Get()
  listProjects(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListProjectsDto,
  ): Promise<PaginatedResult<ProjectEntity>> {
    return this.projectsService.listProjects(user.id, query);
  }

  @Get(':projectId')
  getProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectEntity> {
    return this.projectsService.getProject(user.id, projectId);
  }

  @Patch(':projectId')
  updateProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.updateProject(user.id, projectId, dto);
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  archiveProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<void> {
    return this.projectsService.archiveProject(user.id, projectId);
  }

  @Post(':projectId/conversations')
  createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationEntity> {
    return this.projectsService.createConversation(user.id, projectId, dto);
  }

  @Get(':projectId/conversations')
  listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: PaginationDto,
  ): Promise<PaginatedResult<ConversationEntity>> {
    return this.projectsService.listConversations(user.id, projectId, query);
  }

  @Post(':projectId/conversations/:conversationId/messages')
  createMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: CreateMessageDto,
  ): Promise<MessageEntity> {
    return this.projectsService.createMessage(
      user.id,
      projectId,
      conversationId,
      dto,
    );
  }

  @Get(':projectId/conversations/:conversationId/messages')
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query() query: PaginationDto,
  ): Promise<PaginatedResult<MessageEntity>> {
    return this.projectsService.listMessages(
      user.id,
      projectId,
      conversationId,
      query,
    );
  }
}
