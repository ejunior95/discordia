import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { S3Service } from 'src/shared/s3.service';
import { multerOptions } from 'src/shared/file.upload.config';
import { UserResponseDto } from './dtos/response-user.dto';
import { plainToInstance } from 'class-transformer';
import { AuthGuard } from '@nestjs/passport';
import { EmailService } from 'src/shared/email.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
    private readonly emailService: EmailService,
  ) {}

  @UseInterceptors(FileInterceptor('avatar', multerOptions))
  @Post()
  async create(
    @Body() body: CreateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.create(body, file);
      return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao criar usuário - ${error}`);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.usersService.findAll();
      return users.map(user =>
        plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true }),
      );
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao buscar usuários - ${error}`);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.findOne(id);
      if (!user) {
        throw new HttpException('Usuário não encontrado', 404);
      }
      return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao buscar usuário - ${error}`);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @UseInterceptors(FileInterceptor('avatar'))
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UserResponseDto> {
    try {
      const updatedUser = await this.usersService.update(id, body, file);
      return plainToInstance(UserResponseDto, updatedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao atualizar usuário - ${error?.message || error}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.usersService.remove(id);
      return { message: 'Usuário removido com sucesso' };
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao remover usuário - ${error}`);
    }
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar', multerOptions))
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UserResponseDto> {
    try {
      if (!file) {
        throw new BadRequestException('Arquivo de avatar é obrigatório');
      }

      const url = await this.s3Service.uploadFile(file, `avatars/${id}`);
      const user = await this.usersService.update(id, { avatar: url });
      return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(`Erro ao enviar avatar - ${error}`);
    }
  }
}
