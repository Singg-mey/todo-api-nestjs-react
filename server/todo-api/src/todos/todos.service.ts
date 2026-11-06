import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Todo } from './entities/todo.entity.js';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import {
  TodoCreatedEvent,
  TodoUpdatedEvent,
  TodoDeletedEvent,
} from './events/todo.events.js';

@Injectable()
export class TodosService {
  private readonly logger = new Logger(TodosService.name);

  constructor(
    @InjectRepository(Todo)
    private readonly repo: Repository<Todo>,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly rabbitmq?: RabbitmqService,
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

  async create(dto: CreateTodoDto, userId: number) {
    const todo = this.repo.create({ ...dto, ownerId: userId });
    const saved = await this.repo.save(todo);
    // Emit after DB commit
    this.eventEmitter.emit('todo.created', new TodoCreatedEvent(saved, userId));
    // Stretch S3: Publish todo.created to topic exchange (notification service ignores this)
    this.rabbitmq?.publishTopic('todo.topic', 'todo.created', { todoId: saved.id, title: saved.title });
    return saved;
  }

  async update(id: number, dto: UpdateTodoDto, userId: number) {
    const todo = await this.findOne(id, userId);
    Object.assign(todo, dto);
    const saved = await this.repo.save(todo);
    // Emit after DB commit
    this.eventEmitter.emit('todo.updated', new TodoUpdatedEvent(saved, userId));
    // Stretch S3: Publish todo.completed if done, otherwise todo.updated
    if (saved.status === 'DONE') {
      this.rabbitmq?.publishTopic('todo.topic', 'todo.completed', { todoId: saved.id, title: saved.title });
    } else {
      this.rabbitmq?.publishTopic('todo.topic', 'todo.updated', { todoId: saved.id, title: saved.title });
    }
    return saved;
  }

  async remove(id: number, userId: number) {
    const todo = await this.findOne(id, userId);
    const todoTitle = todo.title;
    await this.repo.remove(todo);
    // Emit after DB commit
    this.eventEmitter.emit('todo.deleted', new TodoDeletedEvent(id, todoTitle, userId));
    // Stretch S3: Publish todo.deleted to topic exchange
    this.rabbitmq?.publishTopic('todo.topic', 'todo.deleted', { todoId: id, title: todoTitle });
  }

  /**
   * Scheduled cleanup: Deletes done todos older than 30 days and logs the count.
   * Runs daily at midnight.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCronCleanup(): Promise<number> {
    return this.purgeOldDoneTodos();
  }

  /**
   * Purges done todos older than 30 days.
   * Can also be called directly for manual testing/verification.
   */
  async purgeOldDoneTodos(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Find all DONE todos older than 30 days
    const candidates = await this.repo.find({
      where: [
        { status: 'DONE', updatedAt: LessThanOrEqual(thirtyDaysAgo) },
        { status: 'DONE', createdAt: LessThanOrEqual(thirtyDaysAgo) },
      ],
    });

    if (candidates.length > 0) {
      const ids = candidates.map((t) => t.id);
      await this.repo.delete(ids);
    }

    const purged = candidates.length;
    this.logger.log(`Purged ${purged}`);
    return purged;
  }

  /**
   * Helper for tests: seeds a 31-day-old done todo to prove scheduled cleanup.
   */
  async seedOldDoneTodo(userId: number, title = '31-day-old done todo'): Promise<Todo> {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const todo = this.repo.create({
      title,
      status: 'DONE',
      ownerId: userId,
      createdAt: thirtyOneDaysAgo,
      updatedAt: thirtyOneDaysAgo,
    });
    return this.repo.save(todo);
  }
}
