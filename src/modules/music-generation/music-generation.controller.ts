import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { MusicGenerationService } from './music-generation.service';
import { UserResponseDto } from '../users/dtos/response-user.dto';

@Controller('music')
export class MusicGenerationController {
  constructor(
    private readonly musicGenerationService: MusicGenerationService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('/rap-verse/:taskId/status')
  async getRapVerseStatus(
    @Param('taskId') taskId: string,
    @Req() req: Request & { user: UserResponseDto },
    @Res() res: Response,
  ) {
    try {
      const result = await this.musicGenerationService.pollAndFinalize(
        taskId,
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
}
