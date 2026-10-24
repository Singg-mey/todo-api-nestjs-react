import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Six Implementation Steps & Stretch E2E Test', () => {
  let app: INestApplication;
  const timestamp = Date.now();
  const user1Email = `user1_${timestamp}@example.com`;
  const user2Email = `user2_${timestamp}@example.com`;
  const adminEmail = `admin_${timestamp}@example.com`;
  const password = 'Password123!';

  let user1Token: string;
  let user1RefreshTokenCookie: string;
  let user1TodoId: number;

  let user2Token: string;
  let user2TodoId: number;

  let adminToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Step 4: Global JwtAuthGuard rejects unauthenticated requests', () => {
    it('GET /api/todos should return 401 Unauthorized without token', async () => {
      await request(app.getHttpServer())
        .get('/api/todos')
        .expect(401);
    });
  });

  describe('Step 2: POST /auth/signup with argon2; 409 if taken', () => {
    it('should successfully sign up User 1', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: user1Email,
          password,
          name: 'Alice User 1',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(user1Email);
      expect(res.body.name).toBe('Alice User 1');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 409 Conflict if email is already taken', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: user1Email,
          password,
          name: 'Duplicate Alice',
        })
        .expect(409);

      expect(res.body.message).toContain('taken');
    });
  });

  describe('Step 3: POST /auth/login returns an access token and refresh cookie', () => {
    it('should login User 1 and return access token + HttpOnly refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user1Email,
          password,
        })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.user.email).toBe(user1Email);

      user1Token = res.body.accessToken;

      // Verify Set-Cookie header contains refreshToken
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = Array.isArray(cookies) ? cookies.find((c: string) => c.startsWith('refreshToken=')) : cookies;
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      user1RefreshTokenCookie = refreshCookie!.split(';')[0];
    });

    it('should return 401 Unauthorized on invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user1Email,
          password: 'wrongPassword!',
        })
        .expect(401);
    });
  });

  describe('Step 5: @CurrentUser(); scope every to-do query to user.id (with 2 users)', () => {
    it('User 1 creates Todo 1', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/todos')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'User 1 Private Task',
          status: 'TODO',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('User 1 Private Task');
      expect(res.body.ownerId).toBeDefined();
      user1TodoId = res.body.id;
    });

    it('User 2 signs up and logs in', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: user2Email,
          password,
          name: 'Bob User 2',
        })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user2Email,
          password,
        })
        .expect(200);

      user2Token = loginRes.body.accessToken;
    });

    it('User 2 GET /api/todos should NOT see User 1 Todo', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/todos')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      const found = res.body.find((t: any) => t.id === user1TodoId);
      expect(found).toBeUndefined();
      expect(res.body.length).toBe(0);
    });

    it('User 2 creates Todo 2', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/todos')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          title: 'User 2 Task',
          status: 'IN_PROGRESS',
        })
        .expect(201);

      expect(res.body.title).toBe('User 2 Task');
      user2TodoId = res.body.id;
    });

    it('User 1 and User 2 see only their own respective todos', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/api/todos')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(res1.body.some((t: any) => t.id === user1TodoId)).toBe(true);
      expect(res1.body.some((t: any) => t.id === user2TodoId)).toBe(false);

      const res2 = await request(app.getHttpServer())
        .get('/api/todos')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);
      expect(res2.body.some((t: any) => t.id === user2TodoId)).toBe(true);
      expect(res2.body.some((t: any) => t.id === user1TodoId)).toBe(false);
    });

    it('User 2 cannot update User 1 Todo (returns 404 / BOLA protection)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/todos/${user1TodoId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'Hacked title' })
        .expect(404);
    });

    it('User 2 cannot delete User 1 Todo (returns 404 / BOLA protection)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/todos/${user1TodoId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);
    });
  });

  describe('Stretch & Homework: Refresh Cookie Rotation, Logout, and @Roles("admin")', () => {
    it('POST /api/auth/refresh rotates the refresh token and returns new access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', user1RefreshTokenCookie)
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');

      // Verify a new cookie is set (token rotation!)
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('Standard user (User 1) GET /api/admin/todos should return 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/todos')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403);
    });

    it('Admin user GET /api/admin/todos should succeed and view all users todos', async () => {
      // Create admin user
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({
          email: adminEmail,
          password,
          name: 'System Admin',
          role: 'admin',
        })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: adminEmail,
          password,
        })
        .expect(200);

      adminToken = loginRes.body.accessToken;

      const adminRes = await request(app.getHttpServer())
        .get('/api/admin/todos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(adminRes.body)).toBe(true);
      expect(adminRes.body.some((t: any) => t.id === user1TodoId)).toBe(true);
      expect(adminRes.body.some((t: any) => t.id === user2TodoId)).toBe(true);
    });

    it('POST /api/auth/logout should clear session and refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body.message).toContain('Logged out');
    });
  });
});
