import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const logs: string[] = []
  const log = (msg: string) => {
    console.log(msg)
    logs.push(msg)
  }

  try {
    log('Starting check-expiry function...')

    if (!RESEND_API_KEY) {
      log('ERROR: RESEND_API_KEY is not set')
    } else {
      log('RESEND_API_KEY is present')
    }

    // 1. 获取所有资产
    // Removing the join with user:user_id(email) to avoid potential issues if foreign key is not detected by PostgREST
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
    
    if (assetsError) {
      log(`Error fetching assets: ${assetsError.message}`)
      throw assetsError
    }
    log(`Fetched ${assets?.length || 0} assets`)

    // 2. Fetch users using Admin API to ensure we get emails
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      log(`Error fetching users: ${usersError.message}`)
      throw usersError
    }
    log(`Fetched ${users?.length || 0} users`)
    
    // Map user ID to email
    const userMap = new Map(users.map(u => [u.id, u.email]))

    // 3. Fetch profiles for WeChat webhook
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    
    if (profilesError) {
      log(`Error fetching profiles: ${profilesError.message}`)
      throw profilesError
    }

    const notifications = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const asset of assets) {
      const userEmail = userMap.get(asset.user_id)
      
      log(`Checking asset: ${asset.name} (ID: ${asset.id})`)
      log(`  User ID: ${asset.user_id}`)
      log(`  User Email: ${userEmail || 'NOT FOUND'}`)
      log(`  Notification Enabled: ${asset.notification_enabled}`)
      log(`  Expiry Date: ${asset.expiry_date}`)

      // ⚠️ 关键检查：如果用户关闭了提醒，直接跳过！
      if (asset.notification_enabled === false) {
        log('  Skipping: Notification disabled')
        continue; 
      }

      if (!userEmail) {
        log('  Skipping: User email not found')
        continue
      }

      const profile = profiles.find(p => p.id === asset.user_id)
      const wechatToken = profile?.wechat_webhook
      const notifyDaysSetting = profile?.notify_days || [30, 7, 1] // Default
      
      const expiryDate = new Date(asset.expiry_date)
      expiryDate.setHours(0, 0, 0, 0)
      
      const diffTime = expiryDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      log(`  Days until expiry: ${diffDays}`)

      // 逻辑：
      // 1. 如果 diffDays 在用户的 notifyDaysSetting 数组中，发送提醒
      // 2. 如果 diffDays <= 0 (已过期)，发送提醒 (防止用户错过) - 可选，这里我们保持如果过期每天提醒
      //    或者可以改为只在过期当天 (0) 和过期后的特定周期提醒。
      //    目前保持：过期后每天提醒，直到用户处理（更新日期或关闭提醒）
      
      let shouldNotify = false
      if (diffDays <= 0) {
          shouldNotify = true
      } else {
          if (notifyDaysSetting.includes(diffDays)) {
              shouldNotify = true
          }
      }

      if (shouldNotify) {
        log('  >>> Adding to notification list')
        
        let subject = ''
        let statusHtml = ''
        let shortStatus = ''

        if (diffDays > 0) {
            subject = `[提醒] ${asset.name} 还有 ${diffDays} 天到期`
            statusHtml = `剩余天数：<span style="font-weight: bold; font-size: 1.2em; color: #D97706;">${diffDays} 天</span>`
            shortStatus = `${diffDays} 天`
        } else if (diffDays === 0) {
            subject = `[紧急] ${asset.name} 今天到期！`
            statusHtml = `状态：<span style="font-weight: bold; font-size: 1.2em; color: #DC2626;">今天到期</span>`
            shortStatus = `今天到期`
        } else {
            const overdueDays = Math.abs(diffDays)
            subject = `[严重过期] ${asset.name} 已过期 ${overdueDays} 天！`
            statusHtml = `状态：<span style="font-weight: bold; font-size: 1.2em; color: #DC2626;">已过期 ${overdueDays} 天</span>`
            shortStatus = `过期 ${overdueDays} 天`
        }

        notifications.push({
          email: userEmail,
          wechatToken: wechatToken,
          assetName: asset.name,
          subject: subject,
          statusHtml: statusHtml,
          shortStatus: shortStatus,
          expiryDate: asset.expiry_date
        })
      } else {
        log(`  Not notifying today (Not in notify_days: ${notifyDaysSetting.join(', ')})`)
      }
    }

    const results = []
    
    // 1. Send Email
    if (RESEND_API_KEY && notifications.length > 0) {
      for (const notification of notifications) {
        log(`Sending email to ${notification.email} for ${notification.assetName}...`)
        
        // Add a 1-second delay before sending to avoid rate limits
        if (results.length > 0) {
             await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'U盾提醒助手 <onboarding@resend.dev>',
            to: notification.email,
            subject: notification.subject,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h1 style="color: #4F46E5;">🔔 资产状态提醒</h1>
                <p>您好，</p>
                <p>您的资产 <strong>${notification.assetName}</strong> 需要关注。</p>
                <div style="background: #FEF2F2; color: #991B1B; padding: 15px; border-radius: 8px; margin: 20px 0; display: inline-block;">
                  ${notification.statusHtml}
                </div>
                <p>到期日期：${notification.expiryDate}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
                <p style="font-size: 12px; color: #888;">来自 U盾/CA 提醒助手</p>
              </div>
            `
          })
        })
        const resData = await res.json()
        log(`Resend response: ${JSON.stringify(resData)}`)
        results.push({ type: 'email', ...resData })
      }
    } else {
        if (!RESEND_API_KEY) log('Skipping email: No API Key')
        if (notifications.length === 0) log('Skipping email: No notifications to send')
    }

    // 2. Send WeChat
    for (const notification of notifications) {
      if (notification.wechatToken) {
        log(`Sending WeChat to token ${notification.wechatToken.substring(0, 5)}...`)
        const res = await fetch('http://www.pushplus.plus/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: notification.wechatToken,
                title: notification.subject,
                content: `您的资产 <b>${notification.assetName}</b> 需要关注。<br/>状态：<b style="color:red">${notification.shortStatus}</b><br/>到期日期：${notification.expiryDate}`,
                template: 'html'
            })
        })
        const resData = await res.json()
        log(`WeChat response: ${JSON.stringify(resData)}`)
        results.push({ type: 'wechat', ...resData })
      } else {
        log(`Skipping WeChat for ${notification.assetName}: No token`)
      }
    }

    return new Response(JSON.stringify({ 
      sent: results.length, 
      details: results,
      logs: logs 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    log(`FATAL ERROR: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message, logs: logs }), { status: 400, headers: corsHeaders })
  }
})
