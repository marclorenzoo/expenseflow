import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email único con el que se registra el usuario',
    example: 'ana.garcia@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña de la cuenta (mínimo 8 caracteres)',
    example: 'MiContraseña123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Nombre visible del usuario (mínimo 2 caracteres)',
    example: 'Ana García',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name: string;
}
