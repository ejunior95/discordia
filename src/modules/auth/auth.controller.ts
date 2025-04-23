import { Controller, Post, Body, BadRequestException, Get, Query, UseGuards, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private configService: ConfigService
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
  try {
    const result = await this.authService.login(loginDto);

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      sameSite: 'lax', // ou 'none' se for ambiente com https
      secure: false, // true se for produção com HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    return result.user;
    } catch (error) {
      throw new BadRequestException(`Erro ao realizar login - ${error}`);
    }
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: 'lax', // ou 'none' se estiver usando HTTPS e domínio diferente
      secure: false, // true se for produção com HTTPS
      // secure: process.env.NODE_ENV === 'production',
    });
    return res.send({ message: 'Logout realizado com sucesso' });
  }


  @Get('verify')
  async verifyEmail(@Query('token') token: string) {
    try {
      const secretEmail = this.configService.get<string>('EMAIL_VERIFICATION_SECRET');
      if(!secretEmail) throw new BadRequestException('Secret de verificação de email não encontrado');

      const payload = this.jwtService.verify(token, {
        secret: secretEmail,
      });

      await this.usersService.verifyUserEmail(payload.email);
      return { message: 'Email verificado com sucesso!' };
    } catch (error) {
      throw new BadRequestException('Token inválido ou expirado');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Req() req: Request) {
    const user = req.user as any;
    return user;
  }

}
