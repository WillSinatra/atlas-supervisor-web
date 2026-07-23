import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DispatchService, DISPATCH_CASCADE_QUEUE } from './dispatch.service';

/**
 * Maneja el vencimiento del timeout (30s por default) de una oferta CASCADE.
 * Una cascada ya en curso al cruzar las 18:00 se deja terminar normalmente:
 * este processor no consulta la ventana horaria, solo si la oferta sigue
 * pendiente. El corte de las 18:00 únicamente evita *iniciar* cascadas nuevas
 * (ver DispatchService.onOrderCreated).
 */
@Processor(DISPATCH_CASCADE_QUEUE)
export class DispatchCascadeProcessor extends WorkerHost {
  private readonly logger = new Logger(DispatchCascadeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  async process(job: Job<{ offerId: string; orderId: string }>): Promise<void> {
    const { offerId, orderId } = job.data;

    const result = await this.prisma.dispatchOffer.updateMany({
      where: { id: offerId, status: 'PENDING' },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    });

    if (result.count === 0) {
      // Ya fue aceptada/cancelada antes de vencer — no-op.
      return;
    }

    this.logger.log(`Oferta CASCADE ${offerId} expiró sin respuesta — avanzando a la siguiente candidata`);
    await this.dispatchService.offerNextCandidate(orderId);
  }
}
