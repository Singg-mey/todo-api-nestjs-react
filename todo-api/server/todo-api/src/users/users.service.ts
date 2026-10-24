import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOneBy({ email });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepo.findOneBy({ id });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepo.create(userData);
    return this.usersRepo.save(user);
  }

  async updateRefreshToken(id: number, hashedRefreshToken: string | null): Promise<void> {
    await this.usersRepo.update(id, { hashedRefreshToken });
  }

  async updateProfile(id: number, data: { name?: string; email?: string }): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    return this.usersRepo.save(user);
  }
}
