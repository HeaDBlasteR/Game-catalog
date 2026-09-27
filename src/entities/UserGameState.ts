import 'reflect-metadata';
import { Entity, ManyToOne, Column, JoinColumn, PrimaryColumn } from 'typeorm';
import { User } from './User';
import { Game } from './Game';

@Entity('user_game_states')
export class UserGameState {
  @PrimaryColumn()
  userId!: number;

  @PrimaryColumn()
  gameId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game!: Game;

  @Column({ type: 'boolean', default: false })
  favorite!: boolean;

  @Column({ type: 'int', default: 0 })
  playtimeSeconds!: number;

  @Column({ type: 'int', default: 0 })
  launchCount!: number;

  @Column({ type: 'datetime', nullable: true })
  lastPlayedAt!: Date | null;
}
