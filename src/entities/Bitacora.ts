import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CatModulos } from './CatModulos';
import { Usuarios } from './Usuarios';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Index('FK_Bitacora_Usuarios', ['idUsuario'], {})
@Index('FK_Bitacora_CatModulos', ['idModulo'], {})
@Entity('Bitacora')
export class Bitacora {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('varchar', { name: 'Modulo', nullable: true, length: 100 })
  modulo: string | null;

  @Column('varchar', { name: 'Descripcion', nullable: true, length: 250 })
  descripcion: string | null;

  @Column('varchar', { name: 'Accion', nullable: true, length: 45 })
  accion: string | null;

  @Column('varchar', { name: 'Query', nullable: true, length: 1000 })
  query: string | null;

  @Column('datetime', {
    name: 'FechaCreacion',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date | null;

  @Column('varchar', { name: 'Estatus', nullable: true, length: 20 })
  estatus: string | null;

  @Column('varchar', { name: 'Error', nullable: true, length: 1000 })
  error: string | null;

  @Column('bigint', { name: 'IdUsuario' })
  idUsuario: number;

  @Column('bigint', { name: 'IdModulo', nullable: true })
  idModulo: number | null;

  @ManyToOne(() => CatModulos, (catModulos) => catModulos.bitacoras, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdModulo',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_Bitacora_CatModulos',
    },
  ])
  idModulo2: CatModulos;

  @ManyToOne(() => Usuarios, (usuarios) => usuarios.bitacoras, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdUsuario',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_Bitacora_Usuarios',
    },
  ])
  idUsuario2: Usuarios;
}
