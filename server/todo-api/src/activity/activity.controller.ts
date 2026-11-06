import { Controller, Get } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller(['activity', 'api/activity'])
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Public()
  @Get()
  getActivity(@CurrentUser() user?: any) {
    const userId = user?.role === 'admin' ? undefined : user?.id;
    return this.activityService.findAll(userId);
  }
}

