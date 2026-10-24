import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodosModule } from './todos/todos.module.js';
import { ProfileController } from './profile/profile.controller.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'todo',
      autoLoadEntities: true,
      synchronize: true,
    }),
    TodosModule,
  ],
  controllers: [ProfileController],
  providers: [],
})
export class AppModule {}