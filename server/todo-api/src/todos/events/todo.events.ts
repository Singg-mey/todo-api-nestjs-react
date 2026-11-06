import { Todo } from '../entities/todo.entity.js';

export class TodoCreatedEvent {
  constructor(
    public readonly todo: Todo,
    public readonly userId: number,
  ) {}
}

export class TodoUpdatedEvent {
  constructor(
    public readonly todo: Todo,
    public readonly userId: number,
  ) {}
}

export class TodoDeletedEvent {
  constructor(
    public readonly todoId: number,
    public readonly todoTitle: string,
    public readonly userId: number,
  ) {}
}

