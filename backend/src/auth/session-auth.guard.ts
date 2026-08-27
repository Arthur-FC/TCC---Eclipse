import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SESSION_COOKIE_NAME } from './session-cookie';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionToken = request.cookies?.[SESSION_COOKIE_NAME] as
      | string
      | undefined;

    if (!sessionToken) {
      throw new UnauthorizedException('Autenticação necessária.');
    }

    request.user = await this.authService.authenticate(sessionToken);
    return true;
  }
}
