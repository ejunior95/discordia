import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CreditsService } from './credits.service';
import { UserRole } from '../users/entities/user.entity';

interface AuthedRequest extends Request {
  user?: { id: string; role?: UserRole };
}

@Controller('credits')
@UseGuards(AuthGuard('jwt'))
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('me')
  async myBalance(@Req() req: AuthedRequest) {
    return this.creditsService.getBalance(req.user!.id);
  }

  @Get('me/transactions')
  async myTransactions(
    @Req() req: AuthedRequest,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsed = Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100);
    return this.creditsService.listTransactions(req.user!.id, parsed, cursor);
  }

  @Post('admin/grant/:userId')
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  async grant(
    @Req() req: AuthedRequest,
    @Param('userId') userId: string,
    @Body() body: { amount: number; reason: string; idempotencyKey?: string },
  ) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Apenas admins podem conceder créditos');
    }
    if (!Number.isFinite(body?.amount) || body.amount <= 0) {
      throw new ForbiddenException('amount deve ser positivo');
    }
    return this.creditsService.grant(
      userId,
      Math.floor(body.amount),
      body.reason || 'admin_grant',
      req.user.id,
      body.idempotencyKey,
    );
  }
}
