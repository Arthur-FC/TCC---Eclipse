import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { BriefingEntity } from './briefing.entity';
import { BriefingsService } from './briefings.service';
import { GenerateBriefingDto } from './dto/generate-briefing.dto';
import { UpdateBriefingDto } from './dto/update-briefing.dto';

@Controller('projects/:projectId/briefings')
@UseGuards(SessionAuthGuard)
export class BriefingsController {
  constructor(private readonly briefingsService: BriefingsService) {}

  @Post('generate')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: GenerateBriefingDto,
  ): Promise<BriefingEntity> {
    return this.briefingsService.generate(user.id, projectId, dto.conversationId);
  }

  @Get('latest')
  getLatest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<BriefingEntity> {
    return this.briefingsService.getLatest(user.id, projectId);
  }

  @Get()
  listVersions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<BriefingEntity[]> {
    return this.briefingsService.listVersions(user.id, projectId);
  }

  @Put(':version')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('version', ParseIntPipe) version: number,
    @Body() dto: UpdateBriefingDto,
  ): Promise<BriefingEntity> {
    return this.briefingsService.update(user.id, projectId, version, dto.data);
  }

  @Post(':version/confirm')
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('version', ParseIntPipe) version: number,
  ): Promise<BriefingEntity> {
    return this.briefingsService.confirm(user.id, projectId, version);
  }
}
