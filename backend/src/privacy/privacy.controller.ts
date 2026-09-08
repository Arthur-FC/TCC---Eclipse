import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '../auth/session-cookie';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { PrivacyService, ProviderUsageResponse } from './privacy.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('privacy')
@UseGuards(SessionAuthGuard)
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService, private readonly config: ConfigService) {}

  @Get('usage')
  usage(@CurrentUser() user: AuthenticatedUser): Promise<ProviderUsageResponse> {
    return this.privacy.usage(user.id);
  }

  @Get('export')
  exportData(@CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown>> {
    return this.privacy.exportData(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.privacy.updateProfile(user.id, dto);
  }

  @Delete('audio-consents/:trackId')
  @HttpCode(204)
  revokeAudioConsent(@CurrentUser() user: AuthenticatedUser, @Param('trackId') trackId: string): Promise<void> {
    return this.privacy.revokeAudioConsent(user.id, trackId);
  }

  @Delete('account')
  @HttpCode(204)
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.privacy.deleteAccount(user.id, dto.password);
    response.clearCookie(
      SESSION_COOKIE_NAME,
      sessionCookieOptions(this.config.get<string>('NODE_ENV') === 'production'),
    );
  }
}
