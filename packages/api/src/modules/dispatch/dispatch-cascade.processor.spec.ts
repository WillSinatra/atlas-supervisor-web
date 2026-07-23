import { Test, TestingModule } from '@nestjs/testing';
import { DispatchCascadeProcessor } from './dispatch-cascade.processor';
import { DispatchService } from './dispatch.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('DispatchCascadeProcessor', () => {
  let processor: DispatchCascadeProcessor;
  let prisma: any;
  let dispatchService: jest.Mocked<Pick<DispatchService, 'offerNextCandidate'>>;

  beforeEach(async () => {
    prisma = { dispatchOffer: { updateMany: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchCascadeProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: DispatchService, useValue: { offerNextCandidate: jest.fn() } },
      ],
    }).compile();

    processor = module.get(DispatchCascadeProcessor);
    dispatchService = module.get(DispatchService);
  });

  it('expira la oferta vencida y avanza a la siguiente candidata cuando sigue PENDING', async () => {
    prisma.dispatchOffer.updateMany.mockResolvedValue({ count: 1 });

    await processor.process({ data: { offerId: 'offer-1', orderId: 'order-1' } } as any);

    expect(prisma.dispatchOffer.updateMany).toHaveBeenCalledWith({
      where: { id: 'offer-1', status: 'PENDING' },
      data: expect.objectContaining({ status: 'EXPIRED' }),
    });
    expect(dispatchService.offerNextCandidate).toHaveBeenCalledWith('order-1');
  });

  it('no hace nada si la oferta ya fue aceptada/cancelada antes de vencer (edge case 18:00: cascada en curso no se corta)', async () => {
    prisma.dispatchOffer.updateMany.mockResolvedValue({ count: 0 });

    await processor.process({ data: { offerId: 'offer-1', orderId: 'order-1' } } as any);

    expect(dispatchService.offerNextCandidate).not.toHaveBeenCalled();
  });
});
