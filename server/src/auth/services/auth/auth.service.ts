import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { RegisterDto } from 'src/auth/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterUser, User } from 'src/auth/types';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  public async register(body: RegisterDto): Promise<RegisterUser> {
    // destruct body
    const { email, username, password, firstName, lastName } = body;

    // check for existing user by email or username - these properties are unique
    const userExists = await this.prisma['User'].findFirst({
      where: {
        OR: [
          {
            email: email.toLowerCase(),
          },
          {
            username: username.toLowerCase(),
          },
        ],
      },
    });

    // user exists
    if (userExists) {
      throw new BadRequestException('Email address or username already taken');
    }

    // Hash password
    const hashedPassword = await this.hashData(password);

    // Create new user
    let user: User;

    try {
      user = await this.prisma['User'].create({
        data: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          password: hashedPassword,
          firstName: firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : null,
          lastName: lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase() : null,
        },
        select: {
          email: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      });
    } catch (e) {
      throw new InternalServerErrorException('Something went wrong while creating the user...');
    }

    return {
      message: 'User successfully created',
      user,
    };
  }

  public async login() {
    // TODO Login
  }

  /** Helpers */
  private async hashData(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }
}
//
