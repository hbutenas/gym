import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { LoginDto, RegisterDto } from 'src/auth/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Payload, RegisterUser, Tokens, User } from 'src/auth/types';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {}

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

  public async login(body: LoginDto): Promise<Tokens> {
    // destruct body
    const { username, password } = body;

    // find existing user
    const user = await this.prisma['User'].findUnique({
      where: {
        username: username.toLowerCase(),
      },
    });

    // couldn't find the user
    if (!user) {
      throw new BadRequestException('Invalid username or password');
    }

    // compare passwords
    const passwordMatches = await bcrypt.compare(password, user.password);

    // passwords doesn't match
    if (!passwordMatches) {
      throw new BadRequestException('Invalid username or password');
    }

    // generate payload
    const userPayload: Payload = {
      id: parseInt(user.id),
      username: user.username,
    };

    // generate tokens
    const tokens = await this.generateJwtTokens(userPayload);

    // update refresh token for user
    await this.updateRefreshToken(user.username, tokens.refreshToken);

    return tokens;
  }

  /** Helpers */
  private async hashData(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }

  private async generateJwtTokens(userPayload: Payload): Promise<Tokens> {
    const accessToken = this.jwt.sign(userPayload, {
      secret: this.config.get('ACCESS_TOKEN'),
      expiresIn: 60 * 15, // 15min
    });

    const refreshToken = this.jwt.sign(userPayload, {
      secret: this.config.get('REFRESH_TOKEN'),
      expiresIn: 60 * 60 * 24 * 7, // 1week
    });

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(username: string, refreshToken: string): Promise<void> {
    // hash refresh token
    const hashedRefreshToken = await this.hashData(refreshToken);

    // update user with hashed refresh token
    await this.prisma['User'].update({
      where: {
        username,
      },
      data: {
        refreshToken: hashedRefreshToken,
      },
    });
  }
}
