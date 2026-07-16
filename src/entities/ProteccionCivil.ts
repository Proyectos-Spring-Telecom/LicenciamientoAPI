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
@Index('IX_ProteccionCivil_IdRegistro', ['idRegistro'], {})
@Entity('ProteccionCivil')
export class ProteccionCivil {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('tinyint', { name: 'EsEmpresa', nullable: true, width: 1 })
  esEmpresa: boolean | null;

  @Column('varchar', { name: 'RazonSocial', nullable: true, length: 191 })
  razonSocial: string | null;

  @Column('varchar', { name: 'RFC', nullable: true, length: 16 })
  rfc: string | null;

  @Column('varchar', { name: 'Nombre', nullable: true, length: 100 })
  nombre: string | null;

  @Column('varchar', { name: 'ApellidoPaterno', nullable: true, length: 100 })
  apellidoPaterno: string | null;

  @Column('varchar', { name: 'ApellidoMaterno', nullable: true, length: 100 })
  apellidoMaterno: string | null;

  @Column('varchar', { name: 'Telefono', nullable: true, length: 50 })
  telefono: string | null;

  @Column('varchar', {
    name: 'RegistroAcreditacion',
    nullable: true,
    length: 20,
  })
  registroAcreditacion: string | null;

  @Column('tinyint', { name: 'TienePrograma', nullable: true, width: 1 })
  tienePrograma: boolean | null;

  @Column('bigint', { name: 'IdRegistro', nullable: true })
  idRegistro: number | null;

  @ManyToOne(() => Registros, (registro) => registro.proteccionCivil, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdRegistro',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_ProteccionCivil_Registros',
    },
  ])
  idRegistro2: Registros;
}
