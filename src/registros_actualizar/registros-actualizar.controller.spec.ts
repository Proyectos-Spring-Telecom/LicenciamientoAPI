import { Test, TestingModule } from '@nestjs/testing';
import { RegistrosActualizarController } from './registros-actualizar.controller';
import { RegistrosActualizarService } from './registros-actualizar.service';

describe('RegistrosActualizarController', () => {
  let controller: RegistrosActualizarController;
  const updateFromMultipart = jest.fn();

  beforeEach(async () => {
    updateFromMultipart.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrosActualizarController],
      providers: [
        {
          provide: RegistrosActualizarService,
          useValue: { updateFromMultipart },
        },
      ],
    }).compile();

    controller = module.get(RegistrosActualizarController);
  });

  it('delega body y files al servicio updateFromMultipart', async () => {
    const body = {
      idRegistro: '10',
      Calle: 'Avenida Universidad',
      'Sapac.NumeroCuenta': '123',
    };
    const files = {
      'LicenciaConstruccion.FirmaPropietario': [
        { originalname: 'f.png' } as Express.Multer.File,
      ],
    };
    updateFromMultipart.mockResolvedValue({
      status: 'success',
      message: 'Registro actualizado correctamente',
      data: { id: 10 },
    });

    const result = await controller.actualizar(body, files);
    expect(updateFromMultipart).toHaveBeenCalledWith(body, files);
    expect(result.status).toBe('success');
  });
});
