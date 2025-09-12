

import { format, parseISO, addHours, subHours } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';

const ALMATY_TIMEZONE = 'Asia/Almaty';

export const dateUtils = {
  toUTCString(localDateTime: string): string {
    const zonedTime = zonedTimeToUtc(localDateTime, ALMATY_TIMEZONE);
    return format(zonedTime, "yyyy-MM-dd'T'HH:mm:ss'Z'");
  },

  fromUTCString(utcDateTime: string): Date {
    const utcDate = parseISO(utcDateTime);
    return utcToZonedTime(utcDate, ALMATY_TIMEZONE);
  },

  formatForDisplay(date: Date): string {
    return formatInTimeZone(date, ALMATY_TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  },

  formatForChart(date: Date): string {
    return formatInTimeZone(date, ALMATY_TIMEZONE, 'dd.MM HH:mm');
  },

  formatForInput(date: Date): string {
    return formatInTimeZone(date, ALMATY_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
  },

  getDefaultTimeRange(): { start: Date; end: Date } {
    const now = new Date();
    const almatyNow = utcToZonedTime(now, ALMATY_TIMEZONE);
    
    return {
      start: subHours(almatyNow, 24),
      end: almatyNow
    };
  }
};
