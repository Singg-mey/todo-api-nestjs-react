import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity.js';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
  ) {}

  async recordActivity(
    action: string,
    todoId: number,
    todoTitle: string,
    userId: number,
  ): Promise<Activity> {
    const activity = this.activityRepo.create({
      action,
      todoId,
      todoTitle,
      userId,
    });
    return this.activityRepo.save(activity);
  }

  async findAll(userId?: number): Promise<Activity[]> {
    const where = userId ? { userId } : {};
    return this.activityRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}

