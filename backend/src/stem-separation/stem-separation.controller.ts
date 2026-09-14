import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { StartStemSeparationDto } from './dto/start-stem-separation.dto';
import { StemSeparationService } from './stem-separation.service';

@Controller('projects/:projectId/references')
@UseGuards(SessionAuthGuard)
export class StemSeparationController {
  constructor(private readonly service: StemSeparationService) {}

  @Get('separations')
  list(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.service.list(user.id, projectId);
  }

  @Post(':referenceId/separation')
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('referenceId', ParseUUIDPipe) referenceId: string,
    @Body() dto: StartStemSeparationDto,
  ) {
    return this.service.start(user.id, projectId, referenceId, dto.libraryTrackId);
  }

  @Get(':referenceId/stems/:stemId/url')
  url(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('referenceId', ParseUUIDPipe) referenceId: string,
    @Param('stemId', ParseUUIDPipe) stemId: string,
    @Query('download') download?: string,
  ) {
    return this.service.stemUrl(user.id, projectId, referenceId, stemId, download === 'true');
  }
}
