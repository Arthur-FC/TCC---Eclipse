import { EvaluationService } from './evaluation.service';

describe('EvaluationService', () => {
  it('upserts ratings only for a project owned by the participant', async () => {
    const now = new Date();
    const responses = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async value => ({ id: 'evaluation-1', createdAt: now, updatedAt: now, ...value })),
    };
    const projects = { existsBy: jest.fn().mockResolvedValue(true) };
    const service = new EvaluationService(responses as never, projects as never);
    const result = await service.save('owner-1', 'project-1', {
      referenceRelevance: 4, moodboardUtility: 5, reuseIntent: 4, comments: ' Útil ',
    });
    expect(projects.existsBy).toHaveBeenCalledWith({ id: 'project-1', ownerId: 'owner-1' });
    expect(result).toMatchObject({ referenceRelevance: 4, moodboardUtility: 5, reuseIntent: 4, comments: 'Útil' });
  });

  it('does not expose whether another participant project exists', async () => {
    const service = new EvaluationService({} as never, { existsBy: jest.fn().mockResolvedValue(false) } as never);
    await expect(service.get('owner-1', 'other-project')).rejects.toThrow('Projeto não encontrado');
  });
});
