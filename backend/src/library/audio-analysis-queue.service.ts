import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AudioAnalysisJobEntity } from './audio-analysis-job.entity';

@Injectable()
export class AudioAnalysisQueueService {
  constructor(
    @InjectRepository(AudioAnalysisJobEntity)
    private readonly jobs: Repository<AudioAnalysisJobEntity>,
  ) {}

  async enqueue(trackId: string): Promise<void> {
    const existing = await this.jobs.findOneBy({ trackId });
    if (existing) {
      existing.status = 'queued';
      existing.availableAt = new Date();
      existing.lockedAt = null;
      existing.errorMessage = null;
      await this.jobs.save(existing);
      return;
    }
    await this.jobs.save(
      this.jobs.create({
        trackId,
        status: 'queued',
        attempts: 0,
        availableAt: new Date(),
        lockedAt: null,
        errorMessage: null,
      }),
    );
  }
}
