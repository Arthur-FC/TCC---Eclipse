import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

const normalizeTags = ({ value }: { value: unknown }): unknown =>
  Array.isArray(value)
    ? [...new Set(value.map((item) => typeof item === 'string' ? item.trim() : item).filter(Boolean))]
    : value;

export class UpdateTrackTagsDto {
  @Transform(normalizeTags)
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  genreTags!: string[];

  @Transform(normalizeTags)
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  moodTags!: string[];

  @Transform(normalizeTags)
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  instrumentTags!: string[];
}
