import 'reflect-metadata';
import { Entity, ManyToOne, Column, JoinColumn, PrimaryColumn, Unique } from 'typeorm';
import { User } from './User';
import { Game } from './Game';

@Entity('user_game_icons')
@Unique(['userId', 'gameId'])
export class UserGameIcon {
  @PrimaryColumn()
  userId!: number;

  @PrimaryColumn()
  gameId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Game, game => game.userIcons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game!: Game;

  @Column({ type: 'text' })
  iconPath!: string;
}