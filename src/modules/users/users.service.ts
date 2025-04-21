import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { User } from './entities/user.entity';
import { ObjectId } from 'mongodb';
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
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ _id: new ObjectId(id) });
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
    await this.userRepository.softDelete(id);
  }
}
