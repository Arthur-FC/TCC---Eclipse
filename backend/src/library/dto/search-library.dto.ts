import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SearchLibraryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(300)
  bpmMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(300)
  bpmMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  genre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  instrument?: string;
}
