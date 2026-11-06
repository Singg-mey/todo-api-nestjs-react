import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Exercise 04: Cross-user access (e2e)', () => {
  let app: INestApplication;
  const timestamp = Date.now();
  const aliceEmail = `alice_${timestamp}@example.com`;
  const bobEmail = `bob_${timestamp}@example.com`;
  const password = 'Password123!';

  let aliceToken: string;
  let bobToken: string;
  let bobTodoId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    // 1. Register and login Bob
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: bobEmail, password, name: 'Bob' })
      .expect(201);

    const bobLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: bobEmail, password })
      .expect(200);
    bobToken = bobLogin.body.accessToken;

    // 2. Bob creates a Todo
    const bobTodoRes = await request(app.getHttpServer())
      .post('/api/todos')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ title: "Bob's Secret Todo", status: 'TODO' })
      .expect(201);
    bobTodoId = bobTodoRes.body.id;

    // 3. Register and login Alice
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: aliceEmail, password, name: 'Alice' })
      .expect(201);

    const aliceLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: aliceEmail, password })
      .expect(200);
    aliceToken = aliceLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("Alice cannot READ Bob's todo (returns documented 404 BOLA protection)", async () => {
    await request(app.getHttpServer())
      .get(`/api/todos/${bobTodoId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(404);
  });

  it("Alice cannot UPDATE Bob's todo (returns documented 404 BOLA protection)", async () => {
    await request(app.getHttpServer())
      .patch(`/api/todos/${bobTodoId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Hacked by Alice' })
      .expect(404);
  });

  it("Alice cannot DELETE Bob's todo (returns documented 404 BOLA protection)", async () => {
    await request(app.getHttpServer())
      .delete(`/api/todos/${bobTodoId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(404);
  });
});
