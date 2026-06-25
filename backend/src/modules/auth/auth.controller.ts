import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // 5 registros cada 10 min por IP: evita la creación masiva de cuentas.
  @Throttle({ default: { ttl: 600000, limit: 5 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // 10 intentos cada 5 min por IP: mitiga la fuerza bruta de credenciales.
  @Throttle({ default: { ttl: 300000, limit: 10 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // 30 refrescos cada 5 min por IP: uso normal pero acotado.
  @Throttle({ default: { ttl: 300000, limit: 30 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }
}
