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

  it('persists a project, a conversation and their messages', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/register')
      .send({
        name: 'Compositora',
        email: 'projeto@example.com',
        password: 'senha-segura-para-projeto',
      })
      .expect(201);

    const project = await agent
      .post('/api/projects')
      .send({ title: '  Trilha do curta  ', description: 'Suspense urbano' })
      .expect(201);
    expect(project.body).toMatchObject({
      title: 'Trilha do curta',
      description: 'Suspense urbano',
      archivedAt: null,
    });
    expect(project.body.id).toMatch(/^[0-9a-f-]{36}$/);

    const conversation = await agent
      .post(`/api/projects/${project.body.id}/conversations`)
      .send({ title: 'Briefing inicial' })
      .expect(201);

    await agent
      .post(
        `/api/projects/${project.body.id}/conversations/${conversation.body.id}/messages`,
      )
      .send({ role: 'user', content: 'Quero uma atmosfera noturna.' })
      .expect(201);
    await agent
      .post(
        `/api/projects/${project.body.id}/conversations/${conversation.body.id}/messages`,
      )
      .send({ role: 'assistant', content: 'Vamos explorar timbres escuros.' })
      .expect(201);

    const messages = await agent
      .get(
        `/api/projects/${project.body.id}/conversations/${conversation.body.id}/messages`,
      )
      .expect(200);
    expect(messages.body).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
    expect(messages.body.items.map((item: { role: string }) => item.role)).toEqual(
      ['assistant', 'user'],
    );
  });

  it('paginates projects and validates pagination parameters', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/register')
      .send({
        name: 'Paginação',
        email: 'paginacao@example.com',
        password: 'senha-segura-para-paginacao',
      })
      .expect(201);
    await agent.post('/api/projects').send({ title: 'Projeto A' }).expect(201);
    await agent.post('/api/projects').send({ title: 'Projeto B' }).expect(201);

    const page = await agent.get('/api/projects?page=2&limit=1').expect(200);
    expect(page.body).toMatchObject({
      page: 2,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
    expect(page.body.items).toHaveLength(1);

    await agent.get('/api/projects?page=0').expect(400);
    await agent.get('/api/projects?limit=101').expect(400);
    await agent.get('/api/projects?includeArchived=sim').expect(400);
  });

  it('updates and logically archives a project', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/register')
      .send({
        name: 'Arquivo',
        email: 'arquivo@example.com',
        password: 'senha-segura-para-arquivo',
      })
      .expect(201);
    const created = await agent
      .post('/api/projects')
      .send({ title: 'Título inicial' })
      .expect(201);

    const updated = await agent
      .patch(`/api/projects/${created.body.id}`)
      .send({ title: 'Título definitivo', description: 'Descrição final' })
      .expect(200);
    expect(updated.body).toMatchObject({
      title: 'Título definitivo',
      description: 'Descrição final',
    });

    await agent.delete(`/api/projects/${created.body.id}`).expect(204);
    const active = await agent.get('/api/projects').expect(200);
    expect(active.body.total).toBe(0);
    const all = await agent
      .get('/api/projects?includeArchived=true')
      .expect(200);
    expect(all.body.total).toBe(1);
    expect(all.body.items[0].archivedAt).toBeTruthy();
    await agent
      .post(`/api/projects/${created.body.id}/conversations`)
      .send({})
      .expect(404);
  });

  it('isolates projects, conversations and messages by owner', async () => {
    const owner = request.agent(app.getHttpServer());
    const intruder = request.agent(app.getHttpServer());
    await owner
      .post('/api/auth/register')
      .send({
        name: 'Proprietário',
        email: 'owner@example.com',
        password: 'senha-segura-do-proprietario',
      })
      .expect(201);
    await intruder
      .post('/api/auth/register')
      .send({
        name: 'Outro usuário',
        email: 'intruder@example.com',
        password: 'senha-segura-do-outro-usuario',
      })
      .expect(201);

    const project = await owner
      .post('/api/projects')
      .send({ title: 'Projeto privado' })
      .expect(201);
    const conversation = await owner
      .post(`/api/projects/${project.body.id}/conversations`)
      .send({})
      .expect(201);
    await owner
      .post(
        `/api/projects/${project.body.id}/conversations/${conversation.body.id}/messages`,
      )
      .send({ role: 'user', content: 'Conteúdo confidencial' })
      .expect(201);

    await intruder.get(`/api/projects/${project.body.id}`).expect(404);
    await intruder
      .get(`/api/projects/${project.body.id}/conversations`)
      .expect(404);
    await intruder
      .get(
        `/api/projects/${project.body.id}/conversations/${conversation.body.id}/messages`,
      )
      .expect(404);
    await intruder.delete(`/api/projects/${project.body.id}`).expect(404);
  });

  it('requires authentication and rejects invalid project content', async () => {
    await request(app.getHttpServer()).get('/api/projects').expect(401);

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/register')
      .send({
        name: 'Validação',
        email: 'validacao@example.com',
        password: 'senha-segura-para-validacao',
      })
      .expect(201);
    await agent.post('/api/projects').send({ title: '   ' }).expect(400);
    await agent
      .post('/api/projects')
      .send({ title: 'Projeto', campoDesconhecido: true })
      .expect(400);
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
