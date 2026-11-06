import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { TodosService } from '../src/todos/todos.service.js';

describe('Lab 05: Events and Background Jobs E2E Tests', () => {
  let app: INestApplication;
  let todosService: TodosService;
  const timestamp = Date.now();
  const testEmail = `events_user_${timestamp}@example.com`;
  const password = 'Password123!';
  let authToken: string;
  let userId: number;
  let createdTodoId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['activity'] });
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    todosService = app.get(TodosService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('03: Queued Email on Registration', () => {
    it('POST /api/auth/signup should register user immediately without blocking', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: testEmail,
          password: password,
          name: 'Events Tester',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testEmail);
      userId = res.body.id;

      // Login to get auth token
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: password,
        })
        .expect(200);

      authToken = loginRes.body.accessToken;
      expect(authToken).toBeDefined();
    });
  });

  describe('01: Activity Listener (todo.created, updated, deleted)', () => {
    it('Creating a todo should trigger activity listener and show in GET /activity', async () => {
      // Create todo
      const createRes = await request(app.getHttpServer())
        .post('/api/todos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Buy groceries for events lab',
          status: 'TODO',
        })
        .expect(201);

      createdTodoId = createRes.body.id;
      expect(createdTodoId).toBeDefined();

      // Small delay for asynchronous event listener
      await new Promise((r) => setTimeout(r, 100));

      // GET /activity
      const activityRes = await request(app.getHttpServer())
        .get('/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(activityRes.body)).toBe(true);
      const createdActivity = activityRes.body.find(
        (a: any) => a.action === 'todo.created' && a.todoId === createdTodoId,
      );
      expect(createdActivity).toBeDefined();
      expect(createdActivity.todoTitle).toBe('Buy groceries for events lab');
    });

    it('Updating a todo should trigger activity listener with todo.updated', async () => {
      await request(app.getHttpServer())
        .patch(`/api/todos/${createdTodoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'DONE',
        })
        .expect(200);

      await new Promise((r) => setTimeout(r, 100));

      const activityRes = await request(app.getHttpServer())
        .get('/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const updatedActivity = activityRes.body.find(
        (a: any) => a.action === 'todo.updated' && a.todoId === createdTodoId,
      );
      expect(updatedActivity).toBeDefined();
    });

    it('Deleting a todo should trigger activity listener with todo.deleted', async () => {
      await request(app.getHttpServer())
        .delete(`/api/todos/${createdTodoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      await new Promise((r) => setTimeout(r, 100));

      const activityRes = await request(app.getHttpServer())
        .get('/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedActivity = activityRes.body.find(
        (a: any) => a.action === 'todo.deleted' && a.todoId === createdTodoId,
      );
      expect(deletedActivity).toBeDefined();
    });
  });

  describe('02: Scheduled Cleanup (@Cron)', () => {
    it('Should purge 31-day-old DONE todo and keep active todos', async () => {
      // 1. Seed a 31-day-old DONE todo
      const oldDoneTodo = await todosService.seedOldDoneTodo(
        userId,
        'Old completed todo 31 days ago',
      );
      expect(oldDoneTodo).toBeDefined();
      expect(oldDoneTodo.status).toBe('DONE');

      // 2. Create a fresh todo that is NOT done
      const freshTodo = await todosService.create(
        { title: 'Fresh pending todo' },
        userId,
      );

      // 3. Run the purge function (same method called by @Cron)
      const purgedCount = await todosService.purgeOldDoneTodos();
      expect(purgedCount).toBeGreaterThanOrEqual(1);

      // 4. Verify 31-day-old todo is gone
      await expect(todosService.findOne(oldDoneTodo.id, userId)).rejects.toThrow();

      // 5. Verify fresh todo remains untouched
      const stillThere = await todosService.findOne(freshTodo.id, userId);
      expect(stillThere).toBeDefined();
      expect(stillThere.id).toBe(freshTodo.id);
    });
  });
});
