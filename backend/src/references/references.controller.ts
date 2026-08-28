import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { SearchYouTubeDto } from './dto/search-youtube.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';
import { MusicReferenceEntity } from './music-reference.entity';
import {
  ReferencesService,
  ReferenceSearchResponse,
} from './references.service';

@Controller('projects/:projectId/references')
@UseGuards(SessionAuthGuard)
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Post('youtube/search')
  searchYouTube(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: SearchYouTubeDto,
  ): Promise<ReferenceSearchResponse> {
    return this.referencesService.searchYouTube(user.id, projectId, dto.refresh);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<MusicReferenceEntity[]> {
    return this.referencesService.list(user.id, projectId);
  }

  @Patch(':referenceId')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('referenceId', ParseUUIDPipe) referenceId: string,
    @Body() dto: UpdateReferenceDto,
  ): Promise<MusicReferenceEntity> {
    return this.referencesService.updateStatus(
      user.id,
      projectId,
      referenceId,
      dto.status,
    );
  }
}
