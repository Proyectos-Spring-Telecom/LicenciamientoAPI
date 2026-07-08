import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Bitacora } from './Bitacora';
import { Permisos } from './Permisos';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Entity('CatModulos')
export class CatModulos {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('varchar', { name: 'Nombre', length: 100 })
  nombre: string;

  @Column('tinyint', { name: 'Estatus', default: () => "'1'" })
  estatus: number;

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

  @OneToMany(() => Bitacora, (bitacora) => bitacora.idModulo2)
  bitacoras: Bitacora[];

  @OneToMany(() => Permisos, (permisos) => permisos.idModulo2)
  permisos: Permisos[];
}
