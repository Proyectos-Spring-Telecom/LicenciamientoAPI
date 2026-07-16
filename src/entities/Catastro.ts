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

@applySchema
@Index('IX_Catastro_IdRegistro', ['idRegistro'], {})
@Entity('Catastro')
export class Catastro {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdRegistro', nullable: true })
  idRegistro: number | null;

  @Column('varchar', { name: 'Clave', nullable: true, length: 200 })
  clave: string | null;

  @Column('varchar', { name: 'M2', nullable: true, length: 20 })
  m2: string | null;

  @Column('double', { name: 'Superficie', nullable: true })
  superficie: number | null;

  @Column('varchar', { name: 'UsoSuelo', nullable: true, length: 20 })
  usoSuelo: string | null;

  @ManyToOne(() => Registros, (registro) => registro.catastros, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdRegistro',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_Catastro_Registros',
    },
  ])
  idRegistro2: Registros;
}
