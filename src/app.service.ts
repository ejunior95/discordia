import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatGptService } from './modules/chat-gpt/chat-gpt.service';
import { DeepseekService } from './modules/deepseek/deepseek.service';
import { GeminiService } from './modules/gemini/gemini.service';
import { GrokService } from './modules/grok/grok.service';
import { IA_Agent } from './entities/agent.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { MongoServerError, ObjectId } from 'mongodb';
import { Question } from './entities/question.entity';
import { CreateAgentDto } from './dtos/create-agent.dto';
import { CreateQuestionDto } from './dtos/create-question.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(IA_Agent)
    private readonly agentRepository: MongoRepository<IA_Agent>,
    @InjectRepository(Question)
    private readonly questionRepository: MongoRepository<Question>,
    private readonly chatGptService: ChatGptService,
    private readonly deepseekService: DeepseekService,
    private readonly geminiService: GeminiService,
    private readonly grokService: GrokService,
  ) {}

  async askToAll(question: string) {
    try {
      const verifyQuestionExists = await this.findAnswersByQuestion(question);
  
      if (verifyQuestionExists.length) {
        const result = {};
        for (const answer of verifyQuestionExists) {
          const agent = await this.findOnIaAgent(answer.agent_id.toString());
          if(agent)
            result[agent.name] = { response: answer.answer };
        }
        return result;
      }

      const [geminiRes, deepseekRes, chatGptRes, grokRes] = await Promise.all([
        this.geminiService.execute(question),
        this.deepseekService.execute(question),
        this.chatGptService.execute(question),
        this.grokService.execute(question),
      ]);
      
      const responses = {
        'gemini': geminiRes.response,
        'deepseek': deepseekRes.response,
        'chat-gpt': chatGptRes.response,
        'grok': grokRes.response,
      };
      
      const allIaAgents = await this.findAllIaAgents();
      await Promise.all(
        allIaAgents.map(agent =>
          this.createQuestion({
            question,
            answer: responses[agent.name],
            agent_id: agent._id.toString(),
          })
        )
      );
      
      return {
        'chat-gpt': { response: chatGptRes.response },
        'gemini': { response: geminiRes.response },
        'deepseek': { response: deepseekRes.response },
        'grok': { response: grokRes.response },
      };      
    } catch (error) {
      console.error('Erro no retorno em um ou mais dos agentes: ', error);
      return error;
    }
  }
  

  async askToOne(question: string, agent: string) {
    try {
      const agentExecutors = {
        'deepseek': async () => await this.deepseekService.execute(question),
        'gemini': async () => await this.geminiService.execute(question),
        'chat-gpt': async () => await this.chatGptService.execute(question),
        'grok': async () => await this.grokService.execute(question)
      };
  
      const executor = agentExecutors[agent];
  
      if (!executor) {
        throw new Error(`Agente de IA "${agent}" não é suportado.`);
      }
  
      const result = await executor();
      return { [agent]: result };
  
    } catch (error) {
      console.error('Erro no askToOne:', error);
      return { error: error.message || 'Erro interno' };
    }
  }
  
  async createAgent(data: CreateAgentDto): Promise<IA_Agent> {
    try {
      const user = this.agentRepository.create(data);
      return await this.agentRepository.save(user);
    } catch (error) {
      if (error instanceof MongoServerError && error?.code === 11000) {
        throw new BadRequestException('Agente de IA já cadastrado!');
      }
      throw error;
    }
  }  

  async createQuestion(data: CreateQuestionDto): Promise<Question> {
    const question = this.questionRepository.create(data);
    return await this.questionRepository.save(question);
  }
  

  async findAllIaAgents(): Promise<IA_Agent[]> {
    return this.agentRepository.find({
      where: { deleted_at: null },
    });
  }

  async findOnIaAgent(id: string): Promise<IA_Agent | null> {
    const agent = await this.agentRepository.findOne({
      where: {
        _id: new ObjectId(id),
        deleted_at: null,
      },
    });
    if (!agent) throw new NotFoundException('Usuário não encontrado');
    return agent;
  }
  
  async findAnswersByQuestion(question: string): Promise<Question[]> {
    return await this.questionRepository.find({
      where: { question },
    });
  }

  async updateIaAgent(id: string, data: { score: number }) {
    const agent = await this.agentRepository.findOneBy({ _id: new ObjectId(id) });
    if (!agent) {
      throw new NotFoundException('Agente de IA não encontrado');
    }
  
    Object.assign(agent, data);
    return this.agentRepository.save(agent);
  }
}
