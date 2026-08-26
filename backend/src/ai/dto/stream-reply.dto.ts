import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

export class StreamReplyDto {
  @IsOptional()
  @IsBoolean()
  retry = false;

  @ValidateIf((dto: StreamReplyDto) => !dto.retry)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 20000)
  content?: string;
}
