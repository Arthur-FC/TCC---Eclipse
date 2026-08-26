import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap';

describe('Eclipse API (e2e)', () => {
  let app: NestExpressApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApplication(app, app.get(ConfigService));
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "sessions", "users" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/health returns the service status', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'eclipse-api',
    });
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });

  it('allows the configured frontend origin', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'http://localhost:4200')
      .expect('access-control-allow-origin', 'http://localhost:4200')
      .expect(200);
  });

  it('registers a user and restores the authenticated session', async () => {
    const agent = request.agent(app.getHttpServer());
    const registration = await agent
      .post('/api/auth/register')
      .send({
        name: '  Artista Eclipse  ',
        email: 'ARTISTA@EXAMPLE.COM',
        password: 'senha-segura-para-testes',
      })
      .expect(201);

    expect(registration.body).toMatchObject({
      name: 'Artista Eclipse',
      email: 'artista@example.com',
    });
    expect(registration.body).not.toHaveProperty('passwordHash');
    expect(registration.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(registration.headers['set-cookie']?.[0]).toContain('SameSite=Lax');

    const session = await agent.get('/api/auth/me').expect(200);
    expect(session.body.email).toBe('artista@example.com');
  });

  it('rejects duplicate accounts and invalid registration data', async () => {
    const payload = {
      name: 'Artista Eclipse',
      email: 'duplicado@example.com',
      password: 'senha-segura-para-testes',
    };

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(payload)
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(payload)
      .expect(409);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'A', email: 'invalido', password: 'curta' })
      .expect(400);
  });

  it('logs in, logs out and rejects reuse of the revoked session', async () => {
    const credentials = {
      email: 'login@example.com',
      password: 'senha-segura-para-login',
    };
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Login', ...credentials })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ ...credentials, password: 'senha-incorreta' })
      .expect(401);

    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send(credentials).expect(200);
    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('disables an account and revokes all of its sessions', async () => {
    const credentials = {
      email: 'desativar@example.com',
      password: 'senha-segura-para-desativar',
    };
    const firstAgent = request.agent(app.getHttpServer());
    const secondAgent = request.agent(app.getHttpServer());

    await firstAgent
      .post('/api/auth/register')
      .send({ name: 'Desativar', ...credentials })
      .expect(201);
    await secondAgent.post('/api/auth/login').send(credentials).expect(200);

    await firstAgent.patch('/api/auth/account/disable').expect(204);
    await firstAgent.get('/api/auth/me').expect(401);
    await secondAgent.get('/api/auth/me').expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(credentials)
      .expect(401);
  });

  it('returns a consistent body for unknown routes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/unknown')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      path: '/api/unknown',
    });
  });
});
