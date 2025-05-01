import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { User } from './entities/user.entity';
import { MongoServerError, ObjectId } from 'mongodb';
import { hashPassword } from 'src/utils/hash';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from 'src/shared/email.service';
import { ConfigService } from '@nestjs/config';
import { S3Service } from 'src/shared/s3.service';
import { compare } from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: MongoRepository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
  ) {}

  async create(data: CreateUserDto, file?: Express.Multer.File): Promise<User> {
    const user = this.userRepository.create({
      ...data,
      password: await hashPassword(data.password),
    });

    const result = await this.userRepository.save(user);
  
    if (file) {
      const url = await this.s3Service.uploadFile(file, `avatars/${result._id}`);
      result.avatar = url;
      await this.userRepository.update(result._id, { avatar: url });
    }
  
  
    if (result instanceof MongoServerError && result?.code === 11000) {
      throw new BadRequestException('Este email já está em uso.');
    }
  
    const secretEmail = this.configService.get<string>('EMAIL_VERIFICATION_SECRET');
    if (!secretEmail) {
      throw new BadRequestException('Secret de verificação de email não encontrado');
    }
  
    const verificationToken = this.jwtService.sign(
      { email: result.email },
      { secret: secretEmail, expiresIn: '1d' },
    );
  
    await this.emailService.sendVerificationEmail(
      result.email,
      result.name,
      verificationToken
    );
  
    return result;
  }
  
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      where: { deleted_at: null },
    });
  }

  async findOne(id: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: {
        _id: new ObjectId(id),
        deleted_at: null,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundException('Usuário com este email não foi encontrado');
    }
    return user;
  }

  async update(id: string, data: UpdateUserDto, file?: Express.Multer.File) {
    const user = await this.userRepository.findOneBy({ _id: new ObjectId(id) });
  
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
  
    if (data.email && data.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: data.email },
        withDeleted: true,
      });
  
      if (existingUser && existingUser._id.toString() !== id) {
        throw new BadRequestException('Este email já está em uso.');
      }
      user.email = data.email;
    }
  
    if (data.name && data.name !== user.name) {
      user.name = data.name;
    }

    if (data.currentPassword && data.password) {
      const isMatch = await compare(data.currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('Senha atual incorreta.');
      }
      user.password = await hashPassword(data.password);
    }
    
    if (file) {
      const url = await this.s3Service.uploadFile(file, `avatars/${id}`);
      user.avatar = url;
    }
  
    return this.userRepository.save(user);
  }
  
  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        _id: new ObjectId(id),
        deleted_at: null,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    await this.userRepository.update(id, {
      deleted_at: new Date(),
    });
  }

  async verifyUserEmail(email: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
  
    if (user.isVerified) return;
  
    await this.userRepository.updateOne(
      { email },
      { $set: { isVerified: true } },
    );
  }
}
