import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CreateTrackUploadDto } from './dto/create-track-upload.dto';
import {
  LibraryService,
  LibraryTrackResponse,
  TrackUploadResponse,
} from './library.service';

@Controller('library/tracks')
@UseGuards(SessionAuthGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post('uploads')
  createUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTrackUploadDto,
  ): Promise<TrackUploadResponse> {
    return this.libraryService.createUpload(user.id, dto);
  }

  @Post(':trackId/complete')
  completeUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trackId', ParseUUIDPipe) trackId: string,
  ): Promise<LibraryTrackResponse> {
    return this.libraryService.completeUpload(user.id, trackId);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LibraryTrackResponse[]> {
    return this.libraryService.list(user.id);
  }

  @Get(':trackId/playback')
  playback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trackId', ParseUUIDPipe) trackId: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    return this.libraryService.playback(user.id, trackId);
  }

  @Delete(':trackId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trackId', ParseUUIDPipe) trackId: string,
  ): Promise<void> {
    return this.libraryService.remove(user.id, trackId);
  }
}
