-- 1. 查看当前已计划的所有任务
select * from cron.job;

-- 2. 查看任务执行日志（最近5条）
-- 这里的 status 若为 'succeeded' 则表示执行成功
select * from cron.job_run_details order by start_time desc limit 5;

-- 3. (测试用) 临时创建一个每分钟执行一次的任务
-- 警告：测试完成后请务必删除，否则会每分钟发送邮件！
/*
select cron.schedule(
  'test-every-minute',
  '* * * * *', 
  $$
  select net.http_post(
      url:='https://owftlotklqlvtedevzsx.supabase.co/functions/v1/check-expiry',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer 您的ANON_KEY"}'::jsonb
  ) as request_id;
  $$
);
*/

-- 4. 删除测试任务
-- select cron.unschedule('test-every-minute');
