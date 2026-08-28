import { IsObject } from 'class-validator';

export class UpdateBriefingDto {
  @IsObject()
  data!: Record<string, unknown>;
}
