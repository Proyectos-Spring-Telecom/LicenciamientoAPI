import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuarios } from './Usuarios';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Index('IDX_CodigoAutenticacion_IdUsuario', ['idUsuario'], {})
@Entity('CodigoAutenticacion')
export class CodigoAutenticacion {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdUsuario' })
  idUsuario: number;

  @Column('varchar', { name: 'Codigo', length: 6 })
  codigo: string;

  @Column('tinyint', { name: 'Tipo', unsigned: true })
  tipo: number;

  @Column('datetime', {
    name: 'FechaCreacion',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion: Date;

  @Column('datetime', { name: 'FechaExpiracion' })
  fechaExpiracion: Date;

  @Column('tinyint', { name: 'Usado', default: () => "'0'" })
  usado: number;

  @Column('datetime', { name: 'FechaUso', nullable: true })
  fechaUso: Date | null;

  @Column('tinyint', { name: 'Estatus', default: () => "'1'" })
  estatus: number;

  @Column('int', { name: 'IntentosFallidos', nullable: true, default: () => "'0'" })
  intentosFallidos: number | null;

  @ManyToOne(() => Usuarios, (usuario) => usuario.codigosAutenticacion, {
    onDelete: 'CASCADE',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn([
    {
      name: 'IdUsuario',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_CodigoAutenticacion_Usuarios',
    },
  ])
  usuario: Usuarios;
}
