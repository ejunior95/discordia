import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dtos/response-user.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET') as string,
    });
  }

  async validate(payload: any): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
  
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.created_at,
    };
  }
}
