import { IsOptional, IsUUID } from 'class-validator';

export class StartStemSeparationDto {
  @IsOptional()
  @IsUUID('4')
  libraryTrackId?: string;
}
