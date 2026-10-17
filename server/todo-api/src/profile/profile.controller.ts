import { Body, Controller, Get, Patch } from '@nestjs/common';

@Controller('profile')
export class ProfileController {
  private user = {
    name: 'Singmey',
    email: 'singmey@example.com',
  };

  @Get()
  getProfile() {
    return this.user;
  }

  @Patch()
  updateProfile(@Body() body: { name?: string; email?: string }) {
    if (body.name !== undefined) {
      this.user.name = body.name;
    }
    if (body.email !== undefined) {
      this.user.email = body.email;
    }
    return this.user;
  }
}
