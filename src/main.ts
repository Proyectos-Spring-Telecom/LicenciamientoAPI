import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpStringResponseFilter } from './utils/http-string-response.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpStringResponseFilter());

  app.enableCors({
    origin: '*', // Permitir todas las URLs; puedes poner un array de URLs específicas
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Licenciamiento')
    .setDescription('Documentación de la API de Licenciamiento')
    .setVersion('1.0')
    .addServer('http://localhost:3005', 'Servidor Local')
    .addServer('https://springtelecom.mx/licenciamientoAPI', 'Servidor Remoto')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'bearer-token',
        description: 'Ingresa el token Bearer',
        in: 'header',
      },
      'bearer-token',
    )
    .addTag('Autenticación', 'Endpoints de autenticación y registro')
    .addTag('Bitácora', 'Registro de actividades del sistema')
    .addTag('Mail', 'Servicio de correo electrónico')
    .addTag('Modulos', 'Gestión de módulos del sistema')
    .addTag('Permisos', 'Gestión de permisos')
    .addTag('Roles', 'Gestión de roles y su relación con permisos')
    .addTag('Usuarios', 'Gestión de usuarios')
    .addTag('Registros', 'Alta de registros del padrón')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: -1,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3010);
}
bootstrap();
