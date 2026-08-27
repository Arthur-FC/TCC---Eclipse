import { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'eclipse_session';

export function sessionCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/api',
  };
}
