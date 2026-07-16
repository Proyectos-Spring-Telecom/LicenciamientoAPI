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
@Index('IX_ContactoRepresentante_IdRegistro', ['idRegistro'], {})
@Entity('ContactoRepresentante')
export class ContactoRepresentante {
  @PrimaryGeneratedColumn({ type: 'int', name: 'Id' })
  id: number;

  @Column('varchar', { name: 'Nombre', nullable: true, length: 100 })
  nombre: string | null;

  @Column('varchar', { name: 'ApellidoPaterno', nullable: true, length: 100 })
  apellidoPaterno: string | null;

  @Column('varchar', { name: 'ApellidoMaterno', nullable: true, length: 100 })
  apellidoMaterno: string | null;

  @Column('varchar', { name: 'Telefono', nullable: true, length: 50 })
  telefono: string | null;

  @Column('varchar', { name: 'Correo', nullable: true, length: 50 })
  correo: string | null;

  @Column('bigint', { name: 'IdRegistro', nullable: true })
  idRegistro: number | null;

  @ManyToOne(() => Registros, (registro) => registro.contactosRepresentante, {
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn([
    {
      name: 'IdRegistro',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_ContactoRepresentante_Registros',
    },
  ])
  idRegistro2: Registros;
}
