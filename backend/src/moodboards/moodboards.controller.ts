import { Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { MoodboardsService, MoodboardResponse } from './moodboards.service';

@Controller('projects/:projectId/moodboards')
@UseGuards(SessionAuthGuard)
export class MoodboardsController {
  constructor(private readonly moodboards: MoodboardsService) {}
  @Post('generate') generate(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string): Promise<MoodboardResponse> { return this.moodboards.generate(user.id, projectId); }
  @Get('latest') latest(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string): Promise<MoodboardResponse> { return this.moodboards.latest(user.id, projectId); }
  @Get() list(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string): Promise<MoodboardResponse[]> { return this.moodboards.list(user.id, projectId); }
  @Get(':version') version(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string, @Param('version', ParseIntPipe) version: number): Promise<MoodboardResponse> { return this.moodboards.version(user.id, projectId, version); }
}
