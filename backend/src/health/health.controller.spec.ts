import { HealthController } from './health.controller';

describe('HealthController', () => {
  const controller = new HealthController();

  it('reports that the API is healthy', () => {
    const response = controller.check();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('eclipse-api');
    expect(response.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
  });
});
