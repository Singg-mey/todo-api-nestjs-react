import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';

@Controller('profile')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getProfile(@CurrentUser('id') userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      role: user.role,
    };
  }

  @Patch()
  async updateProfile(
    @CurrentUser('id') userId: number,
    @Body() body: { name?: string; email?: string },
  ) {
    const user = await this.usersService.updateProfile(userId, body);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
