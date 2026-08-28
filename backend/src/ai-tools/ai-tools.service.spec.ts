import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BriefingsService } from '../briefings/briefings.service';
import { ProjectsService } from '../projects/projects.service';
import { AiToolExecutionEntity } from './ai-tool-execution.entity';
import { AiToolsService } from './ai-tools.service';

describe('AiToolsService', () => {
  const context = {
    ownerId: 'owner-id',
    projectId: 'project-id',
    conversationId: 'conversation-id',
  };

  function createService() {
    const projectsService = {
      getProjectSummary: jest.fn().mockResolvedValue({ title: 'Projeto' }),
      searchProjectMessages: jest.fn().mockResolvedValue([
        { role: 'user', excerpt: 'Quero piano suave.' },
      ]),
    } as unknown as jest.Mocked<ProjectsService>;
    const briefingsService = {
      requireConfirmedBriefing: jest.fn().mockResolvedValue({
        version: 2,
        confirmedAt: new Date(),
        data: { objective: 'Criar uma faixa.' },
      }),
    } as unknown as jest.Mocked<BriefingsService>;
    const repository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    } as unknown as jest.Mocked<Repository<AiToolExecutionEntity>>;
    return {
      service: new AiToolsService(
        projectsService,
        briefingsService,
        repository,
      ),
      projectsService,
      briefingsService,
      repository,
    };
  }

  it('exposes schemas without accepting project or owner identifiers', () => {
    const { service } = createService();
    const schemas = service.getDefinitions();

    expect(schemas.map((tool) => tool.function.name)).toEqual([
      'read_project_summary',
      'read_confirmed_briefing',
      'search_project_messages',
    ]);
    expect(JSON.stringify(schemas)).not.toContain('ownerId');
    expect(JSON.stringify(schemas)).not.toContain('projectId');
  });

  it('validates and executes search within the authenticated context', async () => {
    const { service, projectsService, repository } = createService();
    const result = JSON.parse(
      await service.execute(context, {
        id: 'call-1',
        name: 'search_project_messages',
        arguments: '{"query":" piano ","limit":2}',
      }),
    ) as { ok: boolean };

    expect(result.ok).toBe(true);
    expect(projectsService.searchProjectMessages).toHaveBeenCalledWith(
      'owner-id',
      'project-id',
      'piano',
      2,
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', toolName: 'search_project_messages' }),
    );
  });

  it('rejects unknown tools and invalid arguments without executing them', async () => {
    const { service, projectsService, repository } = createService();
    const unknown = JSON.parse(
      await service.execute(context, {
        id: 'call-unknown',
        name: 'delete_everything',
        arguments: '{}',
      }),
    ) as { error: { code: string } };
    const invalid = JSON.parse(
      await service.execute(context, {
        id: 'call-invalid',
        name: 'search_project_messages',
        arguments: '{"query":"x","projectId":"outro"}',
      }),
    ) as { error: { code: string } };

    expect(unknown.error.code).toBe('tool_not_found');
    expect(invalid.error.code).toBe('invalid_arguments');
    expect(projectsService.searchProjectMessages).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('does not reveal whether an inaccessible project exists', async () => {
    const { service, projectsService } = createService();
    projectsService.getProjectSummary.mockRejectedValueOnce(
      new NotFoundException('Projeto não encontrado.'),
    );

    const result = JSON.parse(
      await service.execute(context, {
        id: 'call-private',
        name: 'read_project_summary',
        arguments: '{}',
      }),
    ) as { ok: boolean; error: { code: string } };

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('not_found');
  });
});
