import { ConfigService } from '@nestjs/config';
import { createRequestSecurityMiddleware } from './request-security';

function response() {
  const value: {
    statusCode: number;
    body: unknown;
    setHeader: jest.Mock;
    status: jest.Mock;
    json: jest.Mock;
  } = {
    statusCode: 200,
    body: undefined,
    setHeader: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  value.status.mockImplementation((code: number) => {
    value.statusCode = code;
    return value;
  });
  value.json.mockImplementation((body: unknown) => {
    value.body = body;
    return value;
  });
  return value;
}

describe('request security middleware', () => {
  const config = new ConfigService({
    CORS_ORIGINS: 'http://localhost:4200', RATE_LIMIT_PER_MINUTE: 2,
    AUTH_RATE_LIMIT_PER_MINUTE: 2, AI_RATE_LIMIT_PER_MINUTE: 2,
    UPLOAD_RATE_LIMIT_PER_HOUR: 2,
  });

  it('blocks a third request in the same window', async () => {
    const middleware = createRequestSecurityMiddleware(config);
    const request = { method: 'GET', path: '/api/projects', ip: '127.0.0.1', socket: {}, get: jest.fn() } as never;
    const next = jest.fn();
    await middleware(request, response() as never, next);
    await middleware(request, response() as never, next);
    const last = response();
    await middleware(request, last as never, next);
    expect(last.statusCode).toBe(429);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('rejects a foreign origin on a state-changing request', async () => {
    const middleware = createRequestSecurityMiddleware(config);
    const request = {
      method: 'POST', path: '/api/projects', ip: '127.0.0.2', socket: {},
      get: jest.fn((name: string) => name === 'origin' ? 'https://evil.example' : undefined),
    } as never;
    const result = response();
    await middleware(request, result as never, jest.fn());
    expect(result.statusCode).toBe(403);
  });
});
