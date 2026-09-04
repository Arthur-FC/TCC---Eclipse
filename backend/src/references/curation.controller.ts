import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurationService } from './curation.service';
import { AddLibraryReferenceDto, AddManualReferenceDto, ReplaceReferenceDto, SaveReferenceSelectionDto } from './dto/curation.dto';

@Controller('projects/:projectId/references')
@UseGuards(SessionAuthGuard)
export class CurationController {
  constructor(private readonly curation: CurationService) {}

  @Get('curation')
  state(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.curation.state(user.id, projectId);
  }

  @Post('curation')
  curate(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.curation.curate(user.id, projectId);
  }

  @Post('manual')
  manual(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: AddManualReferenceDto) {
    return this.curation.addManual(user.id, projectId, dto);
  }

  @Post('library')
  library(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: AddLibraryReferenceDto) {
    return this.curation.addLibrary(user.id, projectId, dto.trackId);
  }

  @Put('selection')
  selection(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: SaveReferenceSelectionDto) {
    return this.curation.saveSelection(user.id, projectId, dto);
  }

  @Post(':referenceId/replace')
  replace(@CurrentUser() user: AuthenticatedUser, @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('referenceId', ParseUUIDPipe) referenceId: string, @Body() dto: ReplaceReferenceDto) {
    return this.curation.replace(user.id, projectId, referenceId, dto.replacementId);
  }
}
