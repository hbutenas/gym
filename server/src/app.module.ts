import { Module } from '@nestjs/common';
import { AuthController } from './auth/controllers/auth/auth.controller';
import { AuthService } from './auth/services/auth/auth.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AppModule {}
