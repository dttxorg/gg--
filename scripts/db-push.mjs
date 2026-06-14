// db-push.mjs — 推送 schema 到数据库（开发用）
// 生产环境用 prisma migrate deploy
import { execSync } from 'node:child_process';
try {
  console.log('Pushing Prisma schema...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Done');
} catch (e) {
  console.error('❌ Failed:', e.message);
  process.exit(1);
}
