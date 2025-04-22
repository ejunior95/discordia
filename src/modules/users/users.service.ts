import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: MongoRepository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService
  ) {}

  async create(data: CreateUserDto): Promise<User> {
      const user = this.userRepository.create({
        ...data,
        password: await hashPassword(data.password),
      });
      const result = await this.userRepository.save(user);
      if (result instanceof MongoServerError && result?.code === 11000) {
        throw new BadRequestException('Este email já está em uso.');
      }

      const secretEmail = this.configService.get<string>('EMAIL_VERIFICATION_SECRET');
      if(!secretEmail) throw new BadRequestException('Secret de verificação de email não encontrado');

      const verificationToken = this.jwtService.sign(
        { email: result.email },
        { secret: secretEmail, expiresIn: '1d' },
      );
    
      await this.emailService.sendVerificationEmail(
        result.email, 
        result.name, 
        verificationToken
      );
      return result
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

  async update(id: string, data: UpdateUserDto) {
    if (data.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: data.email },
        withDeleted: true,
      });

      if (existingUser && existingUser._id !== new ObjectId(id)) {
        throw new BadRequestException('Este email já está em uso.');
      }
    }
    const user = await this.userRepository.findOneBy({ _id: new ObjectId(id) });
  
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (data.password) {
      data.password = await hashPassword(data.password);
    }
  
    Object.assign(user, data);
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
