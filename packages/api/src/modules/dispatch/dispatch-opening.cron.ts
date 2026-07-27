import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SettingsService } from '../settings/settings.service';
import { DispatchConfigService } from './dispatch-config.service';
import { DispatchService } from './dispatch.service';

const LAST_RUN_CONFIG_KEY = 'dispatch.lastOpenRunDate';

@Injectable()
export class DispatchOpeningCron {
  private readonly logger = new Logger(DispatchOpeningCron.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly config: DispatchConfigService,
    private readonly dispatchService: DispatchService,
  ) {}

  /**
   * Corre cada minuto; solo ejecuta la apertura diaria cuando la hora actual
   * cruza dispatch.window.startHour (configurable) y todavía no se corrió
   * hoy — idempotente ante reinicios del proceso.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    const now = new Date();
    const startHour = await this.config.getWindowStartHour();

    if (now.getHours() !== startHour) {
      return;
    }

    const today = now.toISOString().slice(0, 10);
    const lastRun = await this.getLastRunDate();
    if (lastRun === today) {
      return;
    }

    await this.runOpening(today);
  }

  async runOpening(today: string = new Date().toISOString().slice(0, 10)): Promise<void> {
    this.logger.log(`Ejecutando apertura diaria de despacho (${today})`);
    await this.dispatchService.openBacklog();
    await this.settings.setConfig(LAST_RUN_CONFIG_KEY, today, 'dispatch', 'Última fecha en que corrió la apertura diaria');
  }

  private async getLastRunDate(): Promise<string | null> {
    try {
      const config = await this.settings.getConfig(LAST_RUN_CONFIG_KEY);
      return config.value;
    } catch {
      return null;
    }
  }
}
