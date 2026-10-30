import { Controller, Get, UseGuards } from '@nestjs/common';
import { TodosService } from '../todos/todos.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(private readonly todosService: TodosService) {}

  @Get('todos')
  @Roles('admin')
  findAll() {
    return this.todosService.findAllForAdmin();
  }
}
