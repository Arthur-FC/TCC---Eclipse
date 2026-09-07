import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { LibraryTrackResponse, TrackUploadResponse } from '../library/library.service';
import { CreateFinalWorkUploadDto } from './dto/create-final-work-upload.dto';
import { FinalWorksService } from './final-works.service';

@Controller('projects/:projectId/final-works')
@UseGuards(SessionAuthGuard)
export class FinalWorksController {
  constructor(private readonly finalWorks: FinalWorksService) {}

  @Post('uploads')
  createUpload(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateFinalWorkUploadDto): Promise<TrackUploadResponse> {
    return this.finalWorks.createUpload(user.id, projectId, dto);
  }

  @Post(':trackId/complete')
  complete(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string, @Param('trackId', ParseUUIDPipe) trackId: string): Promise<LibraryTrackResponse> {
    return this.finalWorks.complete(user.id, projectId, trackId);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string): Promise<LibraryTrackResponse[]> {
    return this.finalWorks.list(user.id, projectId);
  }
}
