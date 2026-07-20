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
import { CodigoAutenticacion } from './CodigoAutenticacion';
import { Grupos } from './Grupos';
import { RefreshSessions } from './RefreshSessions';
import { Roles } from './Roles';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Index('IX_Usuarios_IdRol', ['idRol'], {})
@Index('IX_Usuarios_IdGrupo', ['idGrupo'], {})
@Entity('Usuarios')
export class Usuarios {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('varchar', { name: 'UserName', nullable: true, length: 191 })
  userName: string | null;

  @Column('tinyint', { name: 'EmailConfirmed', default: () => "'0'" })
  emailConfirmed: number;

  @Column('longtext', { name: 'PasswordHash', nullable: true })
  passwordHash: string | null;

  @Column('longtext', { name: 'PhoneNumber', nullable: true })
  phoneNumber: string | null;

  @Column('smallint', { name: 'Estatus', default: () => "'1'" })
  estatus: number;

  @Column('varchar', { name: 'RefreshToken', nullable: true, length: 191 })
  refreshToken: string | null;

  @Column('bigint', { name: 'IdRol', nullable: true })
  idRol: number | null;

  @Column('bigint', { name: 'IdGrupo', nullable: true })
  idGrupo: number | null;

  @Column('varchar', { name: 'Nombre', nullable: true, length: 191 })
  nombre: string | null;

  @Column('varchar', { name: 'ApellidoPaterno', nullable: true, length: 191 })
  apellidoPaterno: string | null;

  @Column('varchar', { name: 'ApellidoMaterno', nullable: true, length: 191 })
  apellidoMaterno: string | null;

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

  @Column('datetime', { name: 'UltimoLogin', nullable: true })
  ultimoLogin: Date | null;

  @OneToMany(() => Bitacora, (bitacora) => bitacora.idUsuario2)
  bitacoras: Bitacora[];

  @OneToMany(() => RefreshSessions, (refreshSession) => refreshSession.usuario)
  refreshSessions: RefreshSessions[];

  @OneToMany(
    () => CodigoAutenticacion,
    (codigoAutenticacion) => codigoAutenticacion.usuario,
  )
  codigosAutenticacion: CodigoAutenticacion[];

  @ManyToOne(() => Roles, (roles) => roles.usuarios, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdRol',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_Usuarios_Roles',
    },
  ])
  idRol2: Roles;

  @ManyToOne(() => Grupos, (grupos) => grupos.usuarios, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdGrupo',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_Usuarios_Grupos',
    },
  ])
  idGrupo2: Grupos;
}
