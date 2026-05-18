import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  HttpCode,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import {
  ResendVerificationDto,
  VerifyEmailDto,
} from './dtos/verify-email.dto';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { BillingService } from '../billing/billing.service';
import { CreditsService } from '../credits/credits.service';

const ACCESS_TOKEN_COOKIE = 'access_token';
const ACCESS_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly billingService: BillingService,
    private readonly creditsService: CreditsService,
  ) {}

  private setAccessTokenCookie(res: Response, token: string) {
    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setAccessTokenCookie(res, result.access_token);
    return result.user;
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    });
    return res.send({ message: 'Logout realizado com sucesso' });
  }

  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Body() body: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(body.email, body.code);
    this.setAccessTokenCookie(res, result.access_token);
    return result.user;
  }

  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(@Body() body: ResendVerificationDto) {
    try {
      await this.authService.resendVerification(body.email);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      // Para qualquer outro erro retornamos a resposta genérica abaixo,
      // evitando vazar se o email existe ou não.
    }
    return {
      message:
        'Se o email estiver cadastrado e ainda não verificado, um novo código foi enviado.',
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req: Request) {
    const user = req.user as any;
    const userId = user?.id as string;
    const [{ plan }, balance] = await Promise.all([
      this.billingService.getActiveSubscription(userId),
      this.creditsService.getBalance(userId),
    ]);
    return {
      ...user,
      plan: {
        slug: plan.slug,
        name: plan.name,
        capabilities: plan.capabilities ?? [],
        monthlyCredits: plan.monthlyCredits ?? 0,
        unlimitedSoftCap: plan.unlimitedSoftCap ?? null,
      },
      credits: {
        balance: balance.balance,
        monthlyAllowance: balance.monthlyAllowance,
        isUnlimited: balance.isUnlimited,
        periodEnd: balance.periodEnd,
      },
    };
  }
}

