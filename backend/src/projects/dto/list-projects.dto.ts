import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class ListProjectsDto extends PaginationDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  includeArchived = 'false';
}
