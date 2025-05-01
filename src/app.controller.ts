import { 
    Body, 
    Controller, 
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
import { Question } from './entities/question.entity';
import { CreateAgentDto } from './dtos/create-agent.dto';
import { CreateQuestionDto } from './dtos/create-question.dto';
import { UserResponseDto } from './modules/users/dtos/response-user.dto';

const ALLOWED_AGENTS = ['deepseek', 'gemini', 'chat-gpt', 'grok'];

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
  @Post('/create-agent')
  async createNewAgent(@Body() body: CreateAgentDto): Promise<IA_Agent> {
    try {
      return await this.appService.createAgent(body);
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao criar agente de IA - ${error}`);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/create-question')
  async createNewQuestion(@Body() body: CreateQuestionDto): Promise<Question> {
    try {
      return await this.appService.createQuestion(body);
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao salvar a pergunta - ${error}`);
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
  @Get('/find-question')
  async findQuestion(@Body() body: { question: string }): Promise<Question[]> {
    try {
      const { question } = body
      return await this.appService.findAnswersByQuestion(question);
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao buscar agente de IA - ${error}`);
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
