import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { User } from './entities/user.entity';
import { MongoServerError, ObjectId } from 'mongodb';
import { hashPassword } from 'src/utils/hash';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: MongoRepository<User>,
  ) {}

  async create(data: CreateUserDto): Promise<User> {
      const user = this.userRepository.create({
        ...data,
        password: await hashPassword(data.password),
      });
      const result = await this.userRepository.save(user);
      if (result instanceof MongoServerError && result?.code === 11000) {
        throw new BadRequestException('Este e-mail já está em uso.');
      }
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
        throw new BadRequestException('Este e-mail já está em uso.');
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
}
