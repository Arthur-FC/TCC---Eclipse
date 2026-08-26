import { Transform } from 'class-transformer';
import { IsIn, IsString, Length } from 'class-validator';
import { MessageRole } from '../message-role.enum';

export class CreateMessageDto {
  @IsIn([MessageRole.USER])
  role!: MessageRole;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 20000)
  content!: string;
}
