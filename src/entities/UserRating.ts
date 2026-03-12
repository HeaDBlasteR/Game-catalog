import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Unique, Check } from 'typeorm';
import { User } from './User';
import { Game } from './Game';

@Entity('user_ratings')
@Unique(['user', 'game'])
@Check(`"rating" BETWEEN 1 AND 5`)
export class UserRating {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, user => user.ratings, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Game, game => game.ratings, { onDelete: 'CASCADE' })
  game!: Game;

  @Column({ type: 'int' })
  rating!: 1 | 2 | 3 | 4 | 5;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;
}