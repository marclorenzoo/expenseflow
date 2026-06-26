import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email del usuario registrado',
    example: 'ana.garcia@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña de la cuenta',
    example: 'MiContraseña123',
  })
  @IsString()
  password: string;
}
