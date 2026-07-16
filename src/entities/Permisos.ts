import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CatModulos } from './CatModulos';
import { RolesPermisos } from './RolesPermisos';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Index('IX_Permisos_IdModulo', ['idModulo'], {})
@Entity('Permisos')
export class Permisos {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('varchar', { name: 'Nombre', nullable: true, length: 100 })
  nombre: string | null;

  @Column('varchar', { name: 'Descripcion', nullable: true, length: 100 })
  descripcion: string | null;

  @Column('bigint', { name: 'IdModulo' })
  idModulo: number;

  @Column('int', { name: 'Estatus', default: () => "'1'" })
  estatus: number;

  @ManyToOne(() => CatModulos, (catModulos) => catModulos.permisos, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdModulo',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_Permisos_CatModulos',
    },
  ])
  idModulo2: CatModulos;

  @OneToMany(() => RolesPermisos, (rolesPermisos) => rolesPermisos.idPermiso2)
  rolesPermisos: RolesPermisos[];
}
