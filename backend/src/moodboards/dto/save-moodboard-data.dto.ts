import { IsObject } from 'class-validator';

export class SaveMoodboardDataDto {
  @IsObject()
  data!: Record<string, unknown>;
}
