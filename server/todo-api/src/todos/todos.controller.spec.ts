import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { describe, it, expect } from 'vitest';

describe('TodosController (validation - Exercise 02)', () => {
  const target = new ValidationPipe({ transform: true, whitelist: true });
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreateTodoDto,
    data: '',
  };

  it('rejects missing title (400)', async () => {
    try {
      await target.transform({ description: 'desc' }, metadata);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.getStatus()).toBe(400);
      expect(err.getResponse().message).toEqual(
        expect.arrayContaining([expect.stringContaining('title')]),
      );
    }
  });

  it('rejects empty title (400)', async () => {
    try {
      await target.transform({ title: '', description: 'desc' }, metadata);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.getStatus()).toBe(400);
      expect(err.getResponse().message).toEqual(
        expect.arrayContaining([expect.stringContaining('title should not be empty')]),
      );
    }
  });

  it('rejects 101‑character title (400)', async () => {
    const longTitle = 'a'.repeat(101);
    try {
      await target.transform({ title: longTitle, description: 'desc' }, metadata);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.getStatus()).toBe(400);
      expect(err.getResponse().message).toEqual(
        expect.arrayContaining([expect.stringContaining('title must be shorter than or equal to 100 characters')]),
      );
    }
  });
});