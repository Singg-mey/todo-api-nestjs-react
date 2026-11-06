// src/todos/todos.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TodosService } from './todos.service.js';
import { Todo } from './entities/todo.entity.js';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';

describe('TodosService', () => {
  let service: TodosService;
  const mockRepo = {
    save: vi.fn(),
    create: vi.fn(),
  };
  const mockEvent = { emit: vi.fn() };
  const mockRabbit = { publishTopic: vi.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodosService,
        { provide: getRepositoryToken(Todo), useValue: mockRepo },
        { provide: EventEmitter2, useValue: mockEvent },
        { provide: RabbitmqService, useValue: mockRabbit },
      ],
    }).compile();

    service = module.get<TodosService>(TodosService);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should emit after a successful create', async () => {
    const dto = { title: 'My todo', description: '' };
    mockRepo.create.mockReturnValue(dto);
    mockRepo.save.mockResolvedValue({ id: 1, ...dto, userId: 42 });

    const result = await service.create(dto, 42);
    expect(result.id).toBe(1);
    expect(mockEvent.emit).toHaveBeenCalledWith(
      'todo.created',
      expect.objectContaining({
        todo: expect.objectContaining({ id: 1 }),
        userId: 42,
      }),
    );
  });

  it('should **not** emit when repository.save rejects', async () => {
    const dto = { title: 'Fail', description: '' };
    mockRepo.create.mockReturnValue(dto);
    mockRepo.save.mockRejectedValue(new Error('DB error'));

    await expect(service.create(dto, 42)).rejects.toThrow('DB error');
    expect(mockEvent.emit).not.toHaveBeenCalled();
  });
});