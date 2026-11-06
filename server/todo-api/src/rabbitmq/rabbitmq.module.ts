import { Module } from '@nestjs/common';
import { RabbitmqService } from './rabbitmq.service.js';

@Module({
  providers: [RabbitmqService],
  exports: [RabbitmqService],
})
export class RabbitmqModule {}

