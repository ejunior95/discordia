import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { IA_Agent } from './entities/agent.entity';
import { CreateAgentDto, UpdateAgentDto } from './dtos/create-agent.dto';
import { UserResponseDto } from './modules/users/dtos/response-user.dto';
import { ChatContext } from './shared/global.service';
import {
  AskAllDto,
  AskOneDto,
  GameActionDto,
  HangmanDto,
  StartSessionDto,
  VoteRoundDto,
} from './dtos/app.dtos';
import { RequiresCredits } from './modules/credits/requires-credits.decorator';
import { CreditsGuard } from './modules/credits/credits.guard';
import { CreditsRefundInterceptor } from './modules/credits/credits-refund.interceptor';
import { UseInterceptors } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/health')
  healthCheck(@Res() res: Response) {
    const uptimeInSeconds = process.uptime();
    const seconds = Math.floor(uptimeInSeconds % 60);
    const minutes = Math.floor((uptimeInSeconds % 3600) / 60);
    const hours = Math.floor(uptimeInSeconds / 3600);
    const uptimeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return res.status(HttpStatus.OK).json({
      status: 'OK',
      uptime: uptimeString,
      timestamp: new Date().toISOString(),
    });
  }

  @UseGuards(AuthGuard('jwt'), CreditsGuard)
  @UseInterceptors(CreditsRefundInterceptor)
  @RequiresCredits('CHAT_ASK_ALL')
  @Post('/ask-to-all')
  async askToAllAgents(
    @Body() body: AskAllDto,
    @Req() req: Request & { user: UserResponseDto },
    @Res() res: Response,
  ) {
    try {
      const result = await this.appService.askToAll(body.question, req.user.id);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: (error as Error).message });
    }
  }

  @UseGuards(AuthGuard('jwt'), CreditsGuard)
  @UseInterceptors(CreditsRefundInterceptor)
  @RequiresCredits('CHAT_ASK_ONE')
  @Post('/ask-to-one')
  async askToOnlyOneAgent(
    @Body() body: AskOneDto,
    @Req() req: Request & { user: UserResponseDto },
    @Res() res: Response,
  ) {
    try {
      const result = await this.appService.askToOne(
        body.question,
        body.agent,
        req.user.id,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: (error as Error).message });
    }
  }

  @UseGuards(AuthGuard('jwt'), CreditsGuard)
  @UseInterceptors(CreditsRefundInterceptor)
  @RequiresCredits('GAME_ACTION')
  @Post('/ai/game-action')
  async askGameAction(
    @Body() body: GameActionDto,
    @Req() req: Request & { user: UserResponseDto },
    @Res() res: Response,
  ) {
    try {
      const result = await this.appService.askGameAction(
        body.context,
        body.agent,
        body.payload,
        req.user.id,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res
        .status(
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR,
        )
        .json({ message: (error as Error).message });
    }
  }

  @UseGuards(AuthGuard('jwt'), CreditsGuard)
  @UseInterceptors(CreditsRefundInterceptor)
  @RequiresCredits('GAME_ACTION')
  @Post('/hangman/:idSession')
  async hangmanGame(
    @Param('idSession') idSession: string,
    @Body() body: HangmanDto,
    @Req() req: Request & { user: UserResponseDto },
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      if (!idSession) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Sessão inválida ou não informada!' });
      }
      const session = await this.appService.findSessionById(idSession);
      if (!session) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Sessão já encerrada!' });
      }
      const agent = await this.appService.findOnIaAgent(session.agent_ids[0]);
      const result = await this.appService.hangmanGame(
        session.context as 'hangman-chooser' | 'hangman-guesser',
        body.question,
        agent.name as import('./shared/global.service').AgentName,
        userId,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: (error as Error).message });
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/create-agent')
  async createNewAgent(@Body() body: CreateAgentDto): Promise<IA_Agent> {
    try {
      return await this.appService.createAgent(body);
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao criar agente de IA - ${error}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/session/start')
  async startSession(
    @Body() body: StartSessionDto,
    @Req() req: Request & { user: UserResponseDto },
    @Res() res: Response,
  ) {
    try {
      const result = await this.appService.startSession(
        body.context,
        body.agents,
        req.user.id,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: (error as Error).message });
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/session/finish/:idSession')
  async finishSession(@Param('idSession') idSession: string) {
    try {
      await this.appService.finishSession(idSession);
      return { message: 'Sessão encerrada com sucesso' };
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao encerrar sessão - ${error}`,
      );
    }
  }

  @Get('/find-all-agents')
  async findAllAgents(): Promise<IA_Agent[]> {
    try {
      return await this.appService.findAllIaAgents();
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao buscar agentes de IA - ${error}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/find-agent/:id')
  async findOneAgent(@Param('id') id: string): Promise<IA_Agent> {
    try {
      const agent = await this.appService.findOnIaAgent(id);
      if (!agent) throw new HttpException('Agente de IA não encontrado', 404);
      return agent;
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao buscar agente de IA - ${error}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('/clear-history/:context')
  async clearHistoryByParam(@Param('context') context: ChatContext) {
    try {
      return await this.appService.clearAllHistory(context);
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao limpar histórico ${context} - ${error}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('/update-agent/:id')
  async updateAgent(
    @Param('id') id: string,
    @Body() body: UpdateAgentDto,
  ): Promise<IA_Agent> {
    try {
      return await this.appService.updateIaAgent(id, body);
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao atualizar agente de IA - ${error}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/rounds/:id/vote')
  async voteOnRound(
    @Param('id') id: string,
    @Body() body: VoteRoundDto,
    @Req() req: Request & { user: UserResponseDto },
    @Res() res: Response,
  ) {
    try {
      const result = await this.appService.voteOnRound(
        id,
        body.agent,
        req.user.id,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      if (error instanceof HttpException) {
        return res.status(error.getStatus()).json({ message: error.message });
      }
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: (error as Error).message });
    }
  }
}
