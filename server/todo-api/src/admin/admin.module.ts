import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { TodosModule } from '../todos/todos.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TodosModule, AuthModule],
  controllers: [AdminController],
})
export class AdminModule {}
