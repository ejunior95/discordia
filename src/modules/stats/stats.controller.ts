import {
  Controller,
  Get,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { StatsService } from './stats.service';

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
