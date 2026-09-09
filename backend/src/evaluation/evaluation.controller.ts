import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { SaveEvaluationDto } from './dto/save-evaluation.dto';
import { EvaluationResponse, EvaluationService } from './evaluation.service';

@Controller('projects/:projectId/evaluation')
@UseGuards(SessionAuthGuard)
export class EvaluationController {
  constructor(private readonly evaluation: EvaluationService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string): Promise<EvaluationResponse | null> {
    return this.evaluation.get(user.id, projectId);
  }

  @Put()
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: SaveEvaluationDto,
  ): Promise<EvaluationResponse> {
    return this.evaluation.save(user.id, projectId, dto);
  }
}
