import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from './entities/activity.entity.js';
import { ActivityService } from './activity.service.js';
import { ActivityController } from './activity.controller.js';
import { ActivityListener } from './listeners/activity.listener.js';

@Module({
  imports: [TypeOrmModule.forFeature([Activity])],
  controllers: [ActivityController],
  providers: [ActivityService, ActivityListener],
  exports: [ActivityService],
})
export class ActivityModule {}

