import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import * as path from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Cabeceras de seguridad (X-Frame-Options, X-Content-Type-Options, etc.).
  // Va lo primero, antes de CORS y del resto de middleware.
  app.use(helmet());

  // Compresión gzip de las respuestas.
  app.use(compression());

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS estricto: en producción debe apuntar a la URL del frontend (Vercel)
  // vía FRONTEND_URL. En local cae al puerto por defecto de Angular.
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // Swagger / OpenAPI. Por seguridad NO se expone en producción salvo que se
  // active explícitamente con ENABLE_SWAGGER=true. Se monta después de helmet,
  // compression y CORS, y antes de app.listen().
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true';

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ExpenseFlow API')
      .setDescription(
        'API REST de ExpenseFlow — gestión colaborativa de gastos compartidos.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Registro, login y refresco de tokens')
      .addTag('users', 'Perfil, estadísticas e imagen del usuario')
      .addTag('groups', 'Grupos, miembros, balances e imagen de grupo')
      .addTag('expenses', 'Gastos, recibos y OCR de tickets')
      .addTag('notifications', 'Notificaciones del usuario')
      .addTag('activity', 'Registro de actividad de los grupos')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    // El prefijo global ('api') no se aplica a Swagger, así que la ruta se
    // indica completa para servir la doc en /api/docs.
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
