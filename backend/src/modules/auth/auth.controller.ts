import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // 5 registros cada 10 min por IP: evita la creación masiva de cuentas.
  @Throttle({ default: { ttl: 600000, limit: 5 } })
  @Post('register')
  @ApiOperation({ summary: 'Registra un nuevo usuario y devuelve sus tokens' })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado; devuelve los tokens de acceso y refresco.',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos de registro.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // 10 intentos cada 5 min por IP: mitiga la fuerza bruta de credenciales.
  @Throttle({ default: { ttl: 300000, limit: 10 } })
  @Post('login')
  @ApiOperation({ summary: 'Inicia sesión con email y contraseña' })
  @ApiResponse({
    status: 201,
    description: 'Login correcto; devuelve los tokens de acceso y refresco.',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas.' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos de login.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // 30 refrescos cada 5 min por IP: uso normal pero acotado.
  @Throttle({ default: { ttl: 300000, limit: 30 } })
  @Post('refresh')
  @ApiOperation({ summary: 'Refresca los tokens a partir de un refresh token' })
  @ApiResponse({ status: 201, description: 'Tokens renovados.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado.',
  })
  @ApiResponse({ status: 429, description: 'Demasiados refrescos.' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }
}
