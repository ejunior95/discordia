import {
  Controller,
  Get,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { StatsService } from './stats.service';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('/home')
  async getHome(@Res() res: Response) {
    try {
      const snapshot = await this.statsService.getHomeSnapshot();
      return res.status(HttpStatus.OK).json(snapshot);
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao obter snapshot da home - ${(error as Error).message}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/me')
  async getMyStats(@CurrentUser() user: { id: string }, @Res() res: Response) {
    try {
      const stats = await this.statsService.getUserStats(user.id);
      return res.status(HttpStatus.OK).json(stats);
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao obter estatísticas do usuário - ${(error as Error).message}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/me/rounds')
  async getMyRounds(
    @CurrentUser() user: { id: string },
    @Query('limit') limit: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const parsed = limit ? parseInt(limit, 10) : 5;
      const safeLimit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : 5;
      const rounds = await this.statsService.getRecentUserRounds(user.id, safeLimit);
      return res.status(HttpStatus.OK).json(rounds);
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao obter rodadas do usuário - ${(error as Error).message}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/recompute')
  async recompute(@Res() res: Response) {
    try {
      await this.statsService.recompute();
      return res.status(HttpStatus.OK).json({ message: 'Stats recomputadas com sucesso' });
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao recomputar stats - ${(error as Error).message}`,
      );
    }
  }
}
