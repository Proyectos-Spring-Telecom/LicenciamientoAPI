import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Index('FK_Catastro_Licencias', ['idLicencia'], {})
@Entity('Catastro')
export class Catastro {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('bigint', { name: 'IdLicencia', nullable: true })
  idLicencia: number | null;

  @Column('double', { name: 'Clave', nullable: true })
  clave: number | null;

  @Column('varchar', { name: 'M2', nullable: true, length: 20 })
  m2: string | null;

  @Column('double', { name: 'Superficie', nullable: true })
  superficie: number | null;

  @Column('varchar', { name: 'UsoSuelo', nullable: true, length: 20 })
  usoSuelo: string | null;
}
