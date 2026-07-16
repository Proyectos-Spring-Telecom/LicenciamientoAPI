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
@Index('IX_Licencias_IdRegistro', ['idRegistro'], {})
@Entity('Licencias')
export class Licencias {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('varchar', { name: 'Registro', nullable: true, length: 25 })
  registro: string | null;

  @Column('varchar', { name: 'NombreComercial', nullable: true, length: 191 })
  nombreComercial: string | null;

  @Column('varchar', { name: 'Giro', nullable: true, length: 100 })
  giro: string | null;

  @Column('varchar', { name: 'LicenciaSuelo', nullable: true, length: 50 })
  licenciaSuelo: string | null;

  @Column('varchar', { name: 'NombrePropietario', nullable: true, length: 100 })
  nombrePropietario: string | null;

  @Column('varchar', {
    name: 'ApellidoPaternoPropietario',
    nullable: true,
    length: 100,
  })
  apellidoPaternoPropietario: string | null;

  @Column('varchar', {
    name: 'ApellidoMaternoPropietario',
    nullable: true,
    length: 100,
  })
  apellidoMaternoPropietario: string | null;

  @Column('int', { name: 'TipoPersona', nullable: true })
  tipoPersona: number | null;

  @Column('varchar', { name: 'RFC', nullable: true, length: 16 })
  rfc: string | null;

  @Column('datetime', { name: 'FechaExpedicion', nullable: true })
  fechaExpedicion: Date | null;

  @Column('datetime', { name: 'FechaRefrendo', nullable: true })
  fechaRefrendo: Date | null;

  @Column('tinyint', { name: 'Estacionamiento', nullable: true, width: 1 })
  estacionamiento: number | null;

  @Column('int', { name: 'Tipo', nullable: true })
  tipo: number | null;

  @Column('datetime', { name: 'FechaHora', nullable: true })
  fechaHora: Date | null;

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

  @Column('bigint', { name: 'IdRegistro', nullable: true })
  idRegistro: number | null;

  @ManyToOne(() => Registros, (registro) => registro.licencias, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdRegistro',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_Licencias_Registros',
    },
  ])
  idRegistro2: Registros;
}
