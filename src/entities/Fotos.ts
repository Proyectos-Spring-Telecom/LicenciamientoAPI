import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { Registros } from './Registros';
import { TipoFoto } from './TipoFoto';

@applySchema
@Index('IX_Fotos_IdRegistro', ['idRegistro'], {})
@Index('FK_Fotos_TipoFoto', ['idTipoFoto'], {})
@Entity('Fotos')
export class Fotos {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdRegistro', nullable: true })
  idRegistro: number | null;

  @Column('longtext', { name: 'Ruta', nullable: true })
  ruta: string | null;

  @Column('datetime', { name: 'FechaHora', nullable: true })
  fechaHora: Date | null;

  @Column('int', { name: 'IdTipoFoto', nullable: true })
  idTipoFoto: number | null;

  @ManyToOne(() => Registros, (registro) => registro.fotos, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdRegistro',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_Fotos_Registros',
    },
  ])
  idRegistro2: Registros;

  @ManyToOne(() => TipoFoto, (tipoFoto) => tipoFoto.fotos, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdTipoFoto',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_Fotos_TipoFoto',
    },
  ])
  idTipoFoto2: TipoFoto;
}
