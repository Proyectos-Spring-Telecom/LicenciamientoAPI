import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';
import { LicenciaConstruccion } from './LicenciaConstruccion';

@applySchema
@Index('IX_Corresponsables_IdLicenciaConstruccion', ['idLicenciaConstruccion'], {})
@Entity('Corresponsables')
export class Corresponsables {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdLicenciaConstruccion' })
  idLicenciaConstruccion: number;

  @Column('varchar', { name: 'NombreCompleto', nullable: true, length: 191 })
  nombreCompleto: string | null;

  @Column('varchar', {
    name: 'NoRegLicenciaConstruccion',
    nullable: true,
    length: 50,
  })
  noRegLicenciaConstruccion: string | null;

  @Column('varchar', { name: 'CedulaProfesional', nullable: true, length: 30 })
  cedulaProfesional: string | null;

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

  @ManyToOne(
    () => LicenciaConstruccion,
    (licencia) => licencia.corresponsables,
    {
      onDelete: 'CASCADE',
      onUpdate: 'RESTRICT',
    },
  )
  @JoinColumn([
    {
      name: 'IdLicenciaConstruccion',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_Corresponsables_LicenciaConstruccion',
    },
  ])
  idLicenciaConstruccion2: LicenciaConstruccion;
}
