import cron from 'node-cron';
import { prisma } from '../infrastructure/database';
import { logger } from '../config/logger';

const ESCALATION_MINUTES = 15;

export function setupAlertEscalationCron(): void {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - ESCALATION_MINUTES * 60 * 1000);
      const criticalUnacked = await prisma.alert.findMany({
        where: {
          severity: 'CRITICAL',
          status: 'ACTIVE',
          createdAt: { lt: cutoff },
        },
        include: { location: true },
      });

      if (criticalUnacked.length > 0) {
        logger.warn(
          `ESCALATION: ${criticalUnacked.length} critical alerts unacknowledged for > ${ESCALATION_MINUTES} mins`,
        criticalUnacked.map(({ id, location, parameter }) => ({ id, location: location.name, parameter })),
        );
        // In production: send SMS/Email via Twilio/SendGrid here
      }
    } catch (err) {
      logger.error('Alert escalation cron error', err);
    }
  });

  logger.info('Alert escalation cron job scheduled');
}
