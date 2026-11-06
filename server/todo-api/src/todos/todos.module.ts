import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodosService } from './todos.service.js';
import { TodosController } from './todos.controller.js';
import { Todo } from './entities/todo.entity.js';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Todo]), RabbitmqModule],
  controllers: [TodosController],
  providers: [TodosService],
  exports: [TodosService],
})
export class TodosModule {}
