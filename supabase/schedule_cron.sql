-- 开启必要的扩展
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 删除旧的定时任务（如果存在）
select cron.unschedule('check-expiry-daily');

-- 创建每日定时任务
-- 每天北京时间 09:30 执行 (UTC 01:30)
-- 注意：check-expiry 函数已部署且配置为 --no-verify-jwt，但建议带上 Anon Key 或自定义 Secret 以备将来增强安全性
select cron.schedule(
  'check-expiry-daily',
  '30 1 * * *', 
  $$
  select net.http_post(
      url:='https://owftlotklqlvtedevzsx.supabase.co/functions/v1/check-expiry',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZnRsb3RrbHFsdnRlZGV2enN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NDE0NTAsImV4cCI6MjA4NDAxNzQ1MH0.fOyu2bNvI6ekZR06cHz9cs87Ai_v2DBy2JdYw2PR_Rg"}'::jsonb
  ) as request_id;
  $$
);

-- 查看已计划的任务
select * from cron.job;
