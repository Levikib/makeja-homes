import * as cron from 'node-cron';

let cronJob: cron.ScheduledTask | null = null;

export function startCronJobs() {
  if (cronJob) {
    console.log("⚠️ Cron jobs already running");
    return;
  }

  console.log("🚀 Starting cron job scheduler...");

  // Run daily at 6:00 AM
  cronJob = cron.schedule('0 6 * * *', async () => {
    console.log('⏰ Running daily tasks at', new Date().toISOString());
    
    try {
      const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production';
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/cron/daily-tasks`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
        },
      });

      const result = await response.json();
      console.log('✅ Daily tasks completed:', result);
    } catch (error) {
      console.error('❌ Failed to run daily tasks:', error);
    }
  });

  console.log('✅ Cron job scheduled: Daily at 6:00 AM');
}

export function stopCronJobs() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('🛑 Cron jobs stopped');
  }
}
