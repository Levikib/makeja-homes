import { startCronJobs } from '../lib/scheduler';

console.log('🚀 Starting Makeja Homes Cron Scheduler...');
console.log('📅 Scheduled tasks:');
console.log('  - Auto-expire leases: Daily at 6:00 AM');
console.log('  - Renewal reminders: Daily at 6:00 AM');
console.log('');

startCronJobs();

console.log('✅ Cron scheduler running. Press Ctrl+C to stop.');

// Keep process alive
process.stdin.resume();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down cron scheduler...');
  process.exit(0);
});
