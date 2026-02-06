import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CircleMembership } from '../circles/entities/circle-membership.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(CircleMembership)
    private readonly membershipsRepository: Repository<CircleMembership>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate phone number format (E.164)
    if (dto.phoneNumber) {
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      if (!e164Regex.test(dto.phoneNumber)) {
        throw new BadRequestException('Phone number must be in E.164 format (e.g., +34612345678)');
      }
      user.phoneNumber = dto.phoneNumber;
    }

    return this.usersRepository.save(user);
  }

  async getUserCircles(userId: string): Promise<any[]> {
    const memberships = await this.membershipsRepository.find({
      where: { userId, isActive: true },
      relations: ['circle'],
    });

    return memberships.map((m) => ({
      id: m.circle.id,
      name: m.circle.name,
      description: m.circle.description,
      joinedAt: m.joinedAt,
    }));
  }
}
