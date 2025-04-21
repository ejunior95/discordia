import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { S3Service } from 'src/shared/s3.service';
import { multerOptions } from 'src/shared/file.upload.config';
import { UserResponseDto } from './dtos/response-user.dto';
import { plainToInstance } from 'class-transformer';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  async create(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.create(body);
      return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao criar usuário - ${error}`);
    }
  }

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

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.update(id, body);
      return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao atualizar usuário - ${error}`);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.usersService.remove(id);
      return { message: 'Usuário removido com sucesso' };
    } catch (error) {
      throw new InternalServerErrorException(`Erro ao remover usuário - ${error}`);
    }
  }

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
