import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { BitacoraModule } from './bitacora/bitacora.module';
import { ModulosModule } from './modulos/modulos.module';
import { PermisosModule } from './permisos/permisos.module';
import { RolesModule } from './roles/roles.module';
import { MailModule } from './mail/mail.module';
import { RegistrosModule } from './registros/registros.module';
import Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(3306),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow(''), // Puede estar vacío si no hay pass
        DB_DATABASE: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().required(),
        DB_TZ: Joi.string().allow(''),
        HOST: Joi.string().allow(''),
        SMTP: Joi.number().optional(),
        E_MAIL: Joi.string().allow(''),
        SMTP_PASS: Joi.string().allow(''),
        LICENCIA_CONSTRUCCION_STORAGE_PATH: Joi.string().required(),
        FOTOS_REGISTROS_STORAGE_PATH: Joi.string().required(),
        LICENCIA_CONSTRUCCION_PUBLIC_URL: Joi.string().uri().required(),
        FOTOS_REGISTROS_PUBLIC_URL: Joi.string().uri().required(),
        UPLOAD_MAX_SIZE: Joi.number().optional(),
      }),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        autoLoadEntities: false,
        entities: [__dirname + '/entities/*{.ts,.js}'],
        synchronize: false, //Nunca poner en true
        dateStrings: false,
        timezone: config.get<string>('DB_TZ') || 'Z',
        bigNumberStrings: false,
        logging: true,
        extra: {
          // Evita que bigint se devuelvan como string
          decimalNumbers: true,
        },
      }),
    }),

    UsuariosModule,

    AuthModule,

    BitacoraModule,

    PermisosModule,

    RolesModule,

    MailModule,

    ModulosModule,

    RegistrosModule,
  ],
})
export class AppModule { }
