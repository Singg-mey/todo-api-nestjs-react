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

  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const todo = await this.repo.findOneBy({ id });
    if (!todo) {
      throw new NotFoundException(`Todo with ID ${id} not found`);
    }
    return todo;
  }

  create(dto: CreateTodoDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateTodoDto) {
    const todo = await this.findOne(id);
    Object.assign(todo, dto);
    return this.repo.save(todo);
  }

  async remove(id: number) {
    const todo = await this.findOne(id);
    await this.repo.remove(todo);
  }
}