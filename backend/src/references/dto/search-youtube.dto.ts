import { IsBoolean, IsOptional } from 'class-validator';

export class SearchYouTubeDto {
  @IsOptional()
  @IsBoolean()
  refresh = false;
}
