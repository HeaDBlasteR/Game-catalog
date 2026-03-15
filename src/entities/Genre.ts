import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Game } from './Game';

@Entity('genres')
export class Genre {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @ManyToMany(() => Game, game => game.genres)
  games!: Game[];
}