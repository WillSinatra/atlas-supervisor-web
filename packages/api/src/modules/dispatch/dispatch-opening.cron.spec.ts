import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DispatchOpeningCron } from './dispatch-opening.cron';
import { SettingsService } from '../settings/settings.service';
import { DispatchConfigService } from './dispatch-config.service';
import { DispatchService } from './dispatch.service';

describe('DispatchOpeningCron', () => {
  let cron: DispatchOpeningCron;
  let settings: jest.Mocked<Pick<SettingsService, 'getConfig' | 'setConfig'>>;
  let config: jest.Mocked<Pick<DispatchConfigService, 'getWindowStartHour'>>;
  let dispatchService: jest.Mocked<Pick<DispatchService, 'openBacklog'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchOpeningCron,
        {
          provide: SettingsService,
          useValue: { getConfig: jest.fn().mockRejectedValue(new NotFoundException()), setConfig: jest.fn() },
        },
        { provide: DispatchConfigService, useValue: { getWindowStartHour: jest.fn().mockResolvedValue(8) } },
        { provide: DispatchService, useValue: { openBacklog: jest.fn() } },
      ],
    }).compile();

    cron = module.get(DispatchOpeningCron);
    settings = module.get(SettingsService);
    config = module.get(DispatchConfigService);
    dispatchService = module.get(DispatchService);
  });

  afterEach(() => jest.useRealTimers());

  it('no ejecuta la apertura si la hora actual no coincide con dispatch.window.startHour', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-23T14:00:00'));

    await cron.tick();

    expect(dispatchService.openBacklog).not.toHaveBeenCalled();
  });

  it('ejecuta la apertura una vez al cruzar la hora configurada', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-23T08:00:00'));

    await cron.tick();

    expect(dispatchService.openBacklog).toHaveBeenCalledTimes(1);
    expect(settings.setConfig).toHaveBeenCalledWith(
      'dispatch.lastOpenRunDate',
      '2026-07-23',
      'dispatch',
      expect.any(String),
    );
  });

  it('es idempotente: no vuelve a abrir si ya corrió hoy (reinicio del proceso a las 08:05)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-23T08:00:00'));
    (settings.getConfig as jest.Mock).mockResolvedValue({ value: '2026-07-23' });

    await cron.tick();

    expect(dispatchService.openBacklog).not.toHaveBeenCalled();
  });
});
