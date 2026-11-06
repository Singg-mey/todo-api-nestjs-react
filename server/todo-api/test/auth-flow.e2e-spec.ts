// test/auth-flow.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

describe('Authenticated flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const signup = (email: string, password: string, name: string) =>
    request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email, password, name })
      .expect(201);

  const login = (email: string, password: string) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200)
      .then((res) => res.body.accessToken as string);

  it('register → login → create → read (authenticated)', async () => {
    const email = `e2e_${Date.now()}@example.com`;
    await signup(email, 'pwd12345', 'E2E User');

    const token = await login(email, 'pwd12345');
    // ---- CREATE ----
    const created = await request(app.getHttpServer())
      .post('/api/todos')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My e2e todo', description: 'test' })
      .expect(201)
      .then((r) => r.body);

    expect(created.id).toBeDefined();

    // ---- READ BACK ----
    await request(app.getHttpServer())
      .get(`/api/todos/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.title).toBe('My e2e todo');
      });
  });

  it('rejects creation without token (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/todos')
      .send({ title: 'No token', description: 'x' })
      .expect(401);
  });
});