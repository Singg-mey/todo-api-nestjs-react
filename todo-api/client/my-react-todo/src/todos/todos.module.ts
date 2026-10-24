import { Module } from '@nestjs/common';
import { TodosService } from './todos.service.js';
import { TodosController } from './todos.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from './entities/todo.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Todo])
  ],
  controllers: [TodosController],
  providers: [TodosService],
})
export class TodosModule {}
