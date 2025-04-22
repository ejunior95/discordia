import { Controller, Post, Body, BadRequestException, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private configService: ConfigService
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      return await this.authService.login(loginDto);
    } catch (error) {
      throw new BadRequestException(`Erro ao realizar login - ${error}`);
    }
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

}
