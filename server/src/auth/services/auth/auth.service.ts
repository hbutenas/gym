import { Injectable } from '@nestjs/common';
import { RegisterDto } from 'src/auth/dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  public async register(body: RegisterDto) {
    // destruct body
    const { email, username, password, firstName, lastName } = body;

    // check for existing user by email
    const userExists = await this.prisma['User'].findFirst({
      where: {
        email: email.toLowerCase(),
      },
    });
    
    // couldn't find existing user
  }

  public async login() {
    // TODO Login
  }
}
//
