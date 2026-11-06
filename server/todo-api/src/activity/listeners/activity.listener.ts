import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityService } from '../activity.service.js';
import {
  TodoCreatedEvent,
  TodoUpdatedEvent,
  TodoDeletedEvent,
} from '../../todos/events/todo.events.js';

@Injectable()
export class ActivityListener {
  private readonly logger = new Logger(ActivityListener.name);

  constructor(private readonly activityService: ActivityService) {}

  @OnEvent('todo.created')
  async handleTodoCreated(event: TodoCreatedEvent) {
    this.logger.log(`[Activity] Todo created: id=${event.todo.id}, title="${event.todo.title}"`);
    await this.activityService.recordActivity(
      'todo.created',
      event.todo.id,
      event.todo.title,
      event.userId,
    );
  }

  @OnEvent('todo.updated')
  async handleTodoUpdated(event: TodoUpdatedEvent) {
    this.logger.log(`[Activity] Todo updated: id=${event.todo.id}, status="${event.todo.status}"`);
    await this.activityService.recordActivity(
      'todo.updated',
      event.todo.id,
      event.todo.title,
      event.userId,
    );
  }

  @OnEvent('todo.deleted')
  async handleTodoDeleted(event: TodoDeletedEvent) {
    this.logger.log(`[Activity] Todo deleted: id=${event.todoId}, title="${event.todoTitle}"`);
    await this.activityService.recordActivity(
      'todo.deleted',
      event.todoId,
      event.todoTitle,
      event.userId,
    );
  }
}

