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
@Index('IX_Sapac_IdRegistro', ['idRegistro'], {})
@Index('FK_Sapac_TipoServicio', ['idTipoServicio'], {})
@Entity('Sapac')
export class Sapac {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdRegistro', nullable: true })
  idRegistro: number | null;

  @Column('varchar', { name: 'NumeroCuenta', nullable: true, length: 50 })
  numeroCuenta: string | null;

  @Column('varchar', { name: 'Nombre', nullable: true, length: 100 })
  nombre: string | null;

  @Column('varchar', { name: 'ApellidoPaterno', nullable: true, length: 100 })
  apellidoPaterno: string | null;

  @Column('varchar', { name: 'ApellidoMaterno', nullable: true, length: 100 })
  apellidoMaterno: string | null;

  @Column('varchar', { name: 'RFC', nullable: true, length: 16 })
  rfc: string | null;

  @Column('int', { name: 'Sector', nullable: true })
  sector: number | null;

  @Column('int', { name: 'Ruta', nullable: true })
  ruta: number | null;

  @Column('varchar', { name: 'Folio', nullable: true, length: 50 })
  folio: string | null;

  @Column('int', { name: 'IdTipoServicio', nullable: true })
  idTipoServicio: number | null;

  @Column('varchar', { name: 'Medidor', nullable: true, length: 50 })
  medidor: string | null;

  @ManyToOne(() => Registros, (registro) => registro.sapacs, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdRegistro',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_Sapac_Registros',
    },
  ])
  idRegistro2: Registros;
}
