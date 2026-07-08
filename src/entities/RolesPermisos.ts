import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Permisos } from './Permisos';
import { Roles } from './Roles';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Index('UQ_RolesPermisos_IdRol_IdPermiso', ['idRol', 'idPermiso'], {
  unique: true,
})
@Index('IX_RolesPermisos_IdRol', ['idRol'], {})
@Index('IX_RolesPermisos_IdPermiso', ['idPermiso'], {})
@Entity('RolesPermisos')
export class RolesPermisos {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdRol', nullable: true })
  idRol: number | null;

  @Column('bigint', { name: 'IdPermiso', nullable: true })
  idPermiso: number | null;

  @ManyToOne(() => Roles, (roles) => roles.rolesPermisos, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'IdRol', referencedColumnName: 'id' }])
  idRol2: Roles;

  @ManyToOne(() => Permisos, (permisos) => permisos.rolesPermisos, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([{ name: 'IdPermiso', referencedColumnName: 'id' }])
  idPermiso2: Permisos;
}
