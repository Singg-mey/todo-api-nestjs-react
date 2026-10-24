import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from './entities/todo.entity.js';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private repo: Repository<Todo>,
  ) {}

  findAll(userId: number) {
    return this.repo.find({
      where: { ownerId: userId },
      order: { id: 'ASC' },
    });
  }

  findAllForAdmin() {
    return this.repo.find({
      relations: { owner: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number, userId: number) {
    const todo = await this.repo.findOneBy({ id, ownerId: userId });
    if (!todo) {
      throw new NotFoundException(`Todo with ID ${id} not found`);
    }
    return todo;
  }

  create(dto: CreateTodoDto, userId: number) {
    const todo = this.repo.create({ ...dto, ownerId: userId });
    return this.repo.save(todo);
  }

  async update(id: number, dto: UpdateTodoDto, userId: number) {
    const todo = await this.findOne(id, userId);
    Object.assign(todo, dto);
    return this.repo.save(todo);
  }

  async remove(id: number, userId: number) {
    const todo = await this.findOne(id, userId);
    await this.repo.remove(todo);
  }
}