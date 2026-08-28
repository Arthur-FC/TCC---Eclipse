import { IsUUID } from 'class-validator';

export class GenerateBriefingDto {
  @IsUUID()
  conversationId!: string;
}
