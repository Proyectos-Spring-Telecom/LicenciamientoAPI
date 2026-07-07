import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Bitacora } from './Bitacora';
import { Roles } from './Roles';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Index('FK_Usuarios_Roles', ['idRol'], {})
@Entity('Usuarios')
export class Usuarios {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('varchar', { name: 'UserName', nullable: true, length: 191 })
  userName: string | null;

  @Column('varchar', { name: 'NormalizedUserName', nullable: true, length: 191 })
  normalizedUserName: string | null;

  @Column('varchar', { name: 'Email', nullable: true, length: 191 })
  email: string | null;

  @Column('varchar', { name: 'NormalizedEmail', nullable: true, length: 191 })
  normalizedEmail: string | null;

  @Column('tinyint', { name: 'EmailConfirmed', default: () => "'0'" })
  emailConfirmed: number;

  @Column('longtext', { name: 'PasswordHash', nullable: true })
  passwordHash: string | null;

  @Column('longtext', { name: 'SecurityStamp', nullable: true })
  securityStamp: string | null;

  @Column('longtext', { name: 'ConcurrencyStamp', nullable: true })
  concurrencyStamp: string | null;

  @Column('longtext', { name: 'PhoneNumber', nullable: true })
  phoneNumber: string | null;

  @Column('tinyint', { name: 'PhoneNumberConfirmed', default: () => "'0'" })
  phoneNumberConfirmed: number;

  @Column('tinyint', { name: 'TwoFactorEnabled', default: () => "'0'" })
  twoFactorEnabled: number;

  @Column('datetime', { name: 'LockoutEnd', precision: 6, nullable: true })
  lockoutEnd: Date | null;

  @Column('tinyint', { name: 'LockoutEnabled', default: () => "'0'" })
  lockoutEnabled: number;

  @Column('int', { name: 'AccessFailedCount', default: () => "'0'" })
  accessFailedCount: number;

  @Column('smallint', { name: 'Estatus', default: () => "'1'" })
  estatus: number;

  @Column('varchar', { name: 'RefreshToken', nullable: true, length: 191 })
  refreshToken: string | null;

  @Column('bigint', { name: 'IdRol', nullable: true })
  idRol: number | null;

  @Column('varchar', { name: 'Nombre', nullable: true, length: 191 })
  nombre: string | null;

  @Column('varchar', { name: 'ApellidoPaterno', nullable: true, length: 191 })
  apellidoPaterno: string | null;

  @Column('varchar', { name: 'ApellidoMaterno', nullable: true, length: 191 })
  apellidoMaterno: string | null;

  @Column('bigint', { name: 'IdGrupo', nullable: true })
  idGrupo: number | null;

  @Column('datetime', {
    name: 'FechaCreacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column('datetime', {
    name: 'FechaActualizacion',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion: Date;

  @OneToMany(() => Bitacora, (bitacora) => bitacora.idUsuario2)
  bitacoras: Bitacora[];

  @ManyToOne(() => Roles, (roles) => roles.usuarios, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'IdRol', referencedColumnName: 'id' }])
  idRol2: Roles;
}
