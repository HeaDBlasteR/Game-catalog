import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserRole } from '../shared/types';
import { UserRating } from './UserRating';
import * as bcrypt from 'bcrypt';


@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Column({
    type: 'text',
    enum: ['admin', 'user'],
    default: 'user'
  })
  role!: UserRole;

  @OneToMany(() => UserRating, rating => rating.user)
  ratings!: UserRating[];

  async setPassword(password: string) {
    this.password = await bcrypt.hash(password, 10);
  }

  async checkPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}