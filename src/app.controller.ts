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
    UseGuards 
} from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { IA_Agent } from './entities/agent.entity';
import { CreateAgentDto } from './dtos/create-agent.dto';
import { UserResponseDto } from './modules/users/dtos/response-user.dto';
import { ALLOWED_AGENTS, ALLOWED_CONTEXTS } from './shared/global.service';

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

  @UseGuards(AuthGuard('jwt'))
  @Post('/ask-to-all')
    async askToAllAgents(@Req() req: Request & { user: UserResponseDto }, @Res() res: Response) {
        try {
            const { question } = req.body;
            const userId = req.user?.id;
            if (!question || !isNaN(question)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Pergunta não enviada ou inválida!',
                });    
            };
            const result = await this.appService.askToAll(question, userId);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        };
    };

  @UseGuards(AuthGuard('jwt'))
  @Post('/ask-to-one')
    async askToOnlyOneAgent(@Req() req: Request & { user: UserResponseDto }, @Res() res: Response) {
        try {
            const { question, agent } = req.body;
            const userId = req.user?.id;
            if (!question || !isNaN(question)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Pergunta não enviada ou inválida!',
                });    
            };
            if (!agent || !isNaN(agent) || !ALLOWED_AGENTS.includes(agent)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    message: 'Agente de IA não enviado ou inválido!',
                    supported_agents: ALLOWED_AGENTS,
                });    
            };
            const result = await this.appService.askToOne(question, agent, userId);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        };
    };

  @UseGuards(AuthGuard('jwt'))
  @Post('/hangman/:idSession')
    async hangmanGame(
      @Param('idSession') idSession: string,
      @Req() req: Request & { user: UserResponseDto }, 
      @Res() res: Response
    ) {
        try {
            const { question } = req.body;
            const userId = req.user?.id;

            if(!idSession) {
              return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Sessão inválida ou não informada!',
              });    
            }

            const session =  await this.appService.findSessionById(idSession);
            
            if(!session) {
              return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Controller: Sessão já encerrada!',
              });    
            } else {
              const agentName = await this.appService.findOnIaAgent(session.agent_ids[0]);
              const result = await this.appService.hangmanGame(
                // @ts-ignore
                session.context, 
                question, 
                agentName?.name, 
                userId
              );
              return res.status(HttpStatus.OK).json(result);
            }
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
        };
    };

  @UseGuards(AuthGuard('jwt'))
  @Post('/create-agent')
  async createNewAgent(@Body() body: CreateAgentDto): Promise<IA_Agent> {
    try {
      return await this.appService.createAgent(body);
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao criar agente de IA - ${error}`);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/session/start')
  async startSession(@Req() req: Request & { user: UserResponseDto }, @Res() res: Response) {
    try {
      const { context, agents } = req.body;
      const userId = req.user?.id;
      if (!context || !isNaN(context) || !ALLOWED_CONTEXTS.includes(context)) {
          return res.status(HttpStatus.BAD_REQUEST).json({
              message: 'Contexto inválido!',
          });    
      };
      for(let agent of agents) {
        if (!agent || !isNaN(agent) || !ALLOWED_AGENTS.includes(agent)) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Agente de IA não enviado ou inválido!',
                supported_agents: ALLOWED_AGENTS,
            });    
        };
      }
      const result = await this.appService.startSession(context, agents, userId);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/session/finish/:idSession')
  async finishSession(@Param('idSession') idSession: string) {
    try {
      await this.appService.finishSession(idSession);
      return { message: 'Sessão encerrada com sucesso' };
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao encerrar sessão - ${error}`);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/find-all-agents')
  async findAllAgents(): Promise<IA_Agent[]> {
    try {
      return await this.appService.findAllIaAgents();
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao buscar agentes de IA - ${error}`);
    }
  }

  
  @UseGuards(AuthGuard('jwt'))
  @Get('/find-agent/:id')
  async findOneAgent(@Param('id') id: string): Promise<IA_Agent> {
    try {
      const agent = await this.appService.findOnIaAgent(id);
      if (!agent) {
        throw new HttpException('Agente de IA não encontrado', 404);
      }
      return agent;
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao buscar agente de IA - ${error}`);
    }
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Delete('/clear-history/:context')
  async clearHistoryByParam(
    @Param('context') context:  "chat" | "chess" | "hangman-chooser" | "hangman-guesser" | "jokenpo" | "rpg" | "rap-battle") {
    try {
      return await this.appService.clearAllHistory(context)
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao limpar histórico ${context} - ${error}`);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('/update-agent/:id')
  async updateAgent(
    @Param('id') id: string,
    @Body() body: { score: number },
  ): Promise<IA_Agent> {
    try {
      return await this.appService.updateIaAgent(id, body);
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao atualizar agente de IA - ${error}`);
    }
  }

}
