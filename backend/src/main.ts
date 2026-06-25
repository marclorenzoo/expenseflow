import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import * as path from 'path';
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

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
