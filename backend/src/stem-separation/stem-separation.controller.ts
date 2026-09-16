import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Response } from 'express';
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

  @Get(':referenceId/instruments.zip')
  async instrumentArchive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('referenceId', ParseUUIDPipe) referenceId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.service.instrumentArchive(user.id, projectId, referenceId);
    response.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': String(file.buffer.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(file.buffer);
  }
}
