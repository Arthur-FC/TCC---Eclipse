import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SaveEvaluationDto {
  @IsInt() @Min(1) @Max(5) referenceRelevance!: number;
  @IsInt() @Min(1) @Max(5) moodboardUtility!: number;
  @IsInt() @Min(1) @Max(5) reuseIntent!: number;
  @IsOptional() @IsString() @MaxLength(2_000) comments?: string;
}
