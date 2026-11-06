import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'int', nullable: true })
  todoId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  todoTitle: string;

  @Column({ type: 'int', nullable: true })
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}

