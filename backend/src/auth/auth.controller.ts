import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthenticatedUser } from './authenticated-user.interface';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionAuthGuard } from './session-auth.guard';
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedUser> {
    const result = await this.authService.register(dto);
    this.setSessionCookie(response, result.sessionToken);
    return result.user;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedUser> {
    const result = await this.authService.login(dto);
    this.setSessionCookie(response, result.sessionToken);
    return result.user;
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    await this.authService.logout(token);
    this.clearSessionCookie(response);
  }

  @Patch('account/disable')
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.disableAccount(user.id);
    this.clearSessionCookie(response);
  }

  private setSessionCookie(response: Response, token: string): void {
    const ttlDays = this.configService.get<number>('SESSION_TTL_DAYS', 7);
    response.cookie(SESSION_COOKIE_NAME, token, {
      ...sessionCookieOptions(this.isProduction()),
      maxAge: ttlDays * 86_400_000,
    });
  }

  private clearSessionCookie(response: Response): void {
    response.clearCookie(
      SESSION_COOKIE_NAME,
      sessionCookieOptions(this.isProduction()),
    );
  }

  private isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }
}
