import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuarios } from './Usuarios';
import { applySchema } from 'src/common/apply-schema.decorator';

@applySchema
@Entity('Grupos')
export class Grupos {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'Id' })
  id: number;

  @Column('varchar', { name: 'Nombre', nullable: true, length: 50 })
  nombre: string | null;

  @OneToMany(() => Usuarios, (usuarios) => usuarios.idGrupo2)
  usuarios: Usuarios[];
}
