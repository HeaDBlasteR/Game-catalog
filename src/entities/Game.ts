import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import type { GameGenre } from '../shared/types';
import { UserRating } from './UserRating';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'text',
    enum: ['Action packed', 'Adventures', 'Strategies', 'Role-playing games', 'Races', 'Simulators']
  })
  genre!: GameGenre;

  @Column()
  releaseDate!: string;

  @Column()
  developer!: string;

  @Column({ type: 'real', default: 0 })
  averageRating!: number;

  @Column({ default: 0 })
  totalRatings!: number;

  @Column()
  filePath!: string;

  @OneToMany(() => UserRating, rating => rating.game)
  ratings!: UserRating[];
}