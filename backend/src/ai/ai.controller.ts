import {
  Body,
  Controller,
  HttpException,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { AiChatService } from './ai-chat.service';
import { AiProviderError } from './ai-provider.error';
import { StreamReplyDto } from './dto/stream-reply.dto';

@Controller('projects')
@UseGuards(SessionAuthGuard)
export class AiController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post(':projectId/conversations/:conversationId/assistant/stream')
  async streamReply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: StreamReplyDto,
    @Res() response: Response,
  ): Promise<void> {
    response.status(200);
    response.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders();

    const abortController = new AbortController();
    response.once('close', () => {
      if (!response.writableEnded) abortController.abort();
    });

    try {
      this.writeEvent(response, 'ready', { connected: true });
      for await (const event of this.aiChatService.streamReply(
        user.id,
        projectId,
        conversationId,
        dto,
        abortController.signal,
      )) {
        if (response.writableEnded || abortController.signal.aborted) return;
        this.writeEvent(response, event.type, event.data);
      }
    } catch (error) {
      if (!response.writableEnded && !abortController.signal.aborted) {
        this.writeEvent(response, 'error', this.describeError(error));
      }
    } finally {
      if (!response.writableEnded) response.end();
    }
  }

  private writeEvent(response: Response, event: string, data: unknown): void {
    response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  private describeError(error: unknown): {
    code: string;
    message: string;
    retryAfterSeconds?: number;
  } {
    if (error instanceof AiProviderError) {
      const messages = {
        not_configured:
          'A IA ainda não foi configurada. Adicione GROQ_API_KEY ao backend.',
        rate_limited:
          'O limite gratuito da Groq foi atingido. Aguarde e tente novamente.',
        timeout: 'A Groq demorou demais para responder. Tente novamente.',
        unavailable: 'A Groq está indisponível no momento. Tente novamente.',
        invalid_response:
          'A Groq não conseguiu gerar uma resposta válida. Tente novamente.',
      };
      return {
        code: error.code,
        message: messages[error.code],
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }
    if (error instanceof HttpException) {
      return { code: 'request_error', message: error.message };
    }
    return {
      code: 'internal_error',
      message: 'Não foi possível gerar a resposta da IA.',
    };
  }
}
