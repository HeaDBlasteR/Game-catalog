import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { UserRating } from './UserRating';
import { Genre } from './Genre';
import { UserGameIcon } from './UserGameIcon';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ManyToMany(() => Genre, genre => genre.games, { eager: true })
  @JoinTable({
    name: 'game_genres',
    joinColumn: { name: 'gameId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'genreId', referencedColumnName: 'id' }
  })
  genres!: Genre[];

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

  @Column({ type: 'text', nullable: true })
  iconPath!: string | null;

  @OneToMany(() => UserRating, rating => rating.game)
  ratings!: UserRating[];

  @OneToMany(() => UserGameIcon, userGameIcon => userGameIcon.game)
  userIcons!: UserGameIcon[];
}