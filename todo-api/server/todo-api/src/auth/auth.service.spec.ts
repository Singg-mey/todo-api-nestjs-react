import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateRefreshToken: ReturnType<typeof vi.fn>;
  };
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateRefreshToken: vi.fn(),
    };

    jwtService = {
      signAsync: vi.fn(),
      verifyAsync: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('signup', () => {
    it('should throw ConflictException (409) if email is already taken', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 1, email: 'test@example.com' });

      await expect(
        authService.signup({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password with argon2 and create user', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(async (userData) => ({
        id: 1,
        ...userData,
      }));

      const res = await authService.signup({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(res).toEqual({
        id: 1,
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
      });
      expect(usersService.create).toHaveBeenCalled();
      const createdArg = usersService.create.mock.calls[0][0];
      expect(createdArg.password).not.toBe('password123');
      const isValid = await argon2.verify(createdArg.password, 'password123');
      expect(isValid).toBe(true);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException on invalid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const mockRes: any = { cookie: vi.fn() };
      await expect(
        authService.login({ email: 'wrong@example.com', password: 'password' }, mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return access token and set HttpOnly refresh cookie on valid login', async () => {
      const hashedPassword = await argon2.hash('correctPassword');
      usersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        password: hashedPassword,
        name: 'Test',
        role: 'user',
      });
      jwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-456');

      const mockRes: any = { cookie: vi.fn() };
      const result = await authService.login(
        { email: 'user@example.com', password: 'correctPassword' },
        mockRes,
      );

      expect(result.accessToken).toBe('access-token-123');
      expect(result.user.email).toBe('user@example.com');
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token-456',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(usersService.updateRefreshToken).toHaveBeenCalled();
    });
  });
});
