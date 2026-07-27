import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

const DEFAULTS = {
  'dispatch.window.startHour': '8',
  'dispatch.window.endHour': '18',
  'dispatch.cascade.radiusMeters': '8000',
  'dispatch.cascade.timeoutSeconds': '30',
} as const;

type DispatchConfigKey = keyof typeof DEFAULTS;

@Injectable()
export class DispatchConfigService {
  constructor(private readonly settings: SettingsService) {}

  private async getNumber(key: DispatchConfigKey): Promise<number> {
    try {
      const config = await this.settings.getConfig(key);
      const parsed = Number(config.value);
      return Number.isFinite(parsed) ? parsed : Number(DEFAULTS[key]);
    } catch {
      return Number(DEFAULTS[key]);
    }
  }

  async getWindowStartHour(): Promise<number> {
    return this.getNumber('dispatch.window.startHour');
  }

  async getWindowEndHour(): Promise<number> {
    return this.getNumber('dispatch.window.endHour');
  }

  async getCascadeRadiusMeters(): Promise<number> {
    return this.getNumber('dispatch.cascade.radiusMeters');
  }

  async getCascadeTimeoutSeconds(): Promise<number> {
    return this.getNumber('dispatch.cascade.timeoutSeconds');
  }

  async isWithinWindow(date: Date = new Date()): Promise<boolean> {
    const [startHour, endHour] = await Promise.all([
      this.getWindowStartHour(),
      this.getWindowEndHour(),
    ]);
    const hour = date.getHours();
    return hour >= startHour && hour < endHour;
  }
}
