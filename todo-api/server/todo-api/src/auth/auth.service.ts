import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Response } from 'express';
import { UsersService } from '../users/users.service.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already taken');
    }

    const hashedPassword = await argon2.hash(dto.password);

    try {
      const user = await this.usersService.create({
        email: dto.email,
        password: hashedPassword,
        name: dto.name || dto.email.split('@')[0],
        role: dto.role || 'user',
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException('Email is already taken');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await argon2.verify(user.password, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
    const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

    // Store hashed refresh token for rotation
    const hashedRefreshToken = await argon2.hash(refreshToken);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string | undefined, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const tokenMatches = await argon2.verify(user.hashedRefreshToken, refreshToken);
    if (!tokenMatches) {
      // Possible reuse detected, invalidate stored token
      await this.usersService.updateRefreshToken(user.id, null);
      res.clearCookie('refreshToken', { path: '/' });
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token rotation
    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const newAccessToken = await this.jwtService.signAsync(newPayload, { expiresIn: '15m' });
    const newRefreshToken = await this.jwtService.signAsync(newPayload, { expiresIn: '7d' });

    const newHashedRefreshToken = await argon2.hash(newRefreshToken);
    await this.usersService.updateRefreshToken(user.id, newHashedRefreshToken);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async logout(userId: number, res: Response) {
    if (userId) {
      await this.usersService.updateRefreshToken(userId, null);
    }
    res.clearCookie('refreshToken', { path: '/' });
    return { message: 'Logged out successfully' };
  }
}
