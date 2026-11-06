import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TodosService } from './todos.service.js';
import { Todo } from './entities/todo.entity.js';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';

describe('TodosService', () => {
  let service: TodosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodosService,
        {
          provide: getRepositoryToken(Todo),
          useValue: {
            find: vi.fn(),
            findOneBy: vi.fn(),
            save: vi.fn(),
            create: vi.fn(),
            remove: vi.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: vi.fn(),
          },
        },
        {
          provide: RabbitmqService,
          useValue: {
            publishTopic: vi.fn(),
            publishEmailJob: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TodosService>(TodosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
