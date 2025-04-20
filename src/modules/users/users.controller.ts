import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
  } from '@nestjs/common';
  import { UsersService } from './users.service';
  import { User } from './entities/user.entity';
  
  @Controller('users')
  export class UsersController {
    constructor(private readonly usersService: UsersService) {}
  
    @Post()
    create(@Body() body: Partial<User>) {
      return this.usersService.create(body);
    }
  
    @Get()
    findAll() {
      return this.usersService.findAll();
    }
  
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.usersService.findOne(id);
    }
  
    @Put(':id')
    update(@Param('id') id: string, @Body() body: Partial<User>) {
      return this.usersService.update(id, body);
    }
  
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.usersService.remove(id);
    }
  }
  