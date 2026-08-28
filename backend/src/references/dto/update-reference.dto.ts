import { IsEnum } from 'class-validator';
import { ReferenceStatus } from '../reference-status.enum';

export class UpdateReferenceDto {
  @IsEnum(ReferenceStatus)
  status!: ReferenceStatus;
}
