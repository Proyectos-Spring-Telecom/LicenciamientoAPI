import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuarios } from './Usuarios';
import { RolesPermisos } from './RolesPermisos';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Entity('Roles')
export class Roles {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id!: number;

  @Column('varchar', { name: 'Nombre', length: 50 })
  nombre!: string;

  @Column('tinyint', { name: 'Estatus', default: () => "'1'" })
  estatus!: number;

  @Column('datetime', {
    name: 'FechaCreacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;

  @Column('datetime', {
    name: 'FechaActualizacion',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion!: Date;

  @OneToMany(() => Usuarios, (usuarios) => usuarios.idRol2)
  usuarios!: Usuarios[];

  @OneToMany(() => RolesPermisos, (rolesPermisos) => rolesPermisos.idRol2)
  rolesPermisos!: RolesPermisos[];
}
