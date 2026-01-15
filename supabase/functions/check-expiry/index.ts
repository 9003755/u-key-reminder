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

  try {
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select(`*, user:user_id (email)`)
    
    if (assetsError) throw assetsError

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    
    if (profilesError) throw profilesError

    const notifications = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const asset of assets) {
      if (!asset.user?.email) continue
      const profile = profiles.find(p => p.id === asset.user_id)
      const notifyDays = profile?.notify_days || [30, 7, 1]
      
      const expiryDate = new Date(asset.expiry_date)
      expiryDate.setHours(0, 0, 0, 0)
      
      const diffTime = expiryDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // 逻辑升级：
      // 1. 在预设的提醒日 (30, 7, 1) 发送
      // 2. 或者：如果已经到期或过期 (diffDays <= 0)，每天都发送！
      if (notifyDays.includes(diffDays) || diffDays <= 0) {
        
        let subject = ''
        let statusHtml = ''

        if (diffDays > 0) {
            subject = `[提醒] ${asset.name} 还有 ${diffDays} 天到期`
            statusHtml = `剩余天数：<span style="font-weight: bold; font-size: 1.2em; color: #D97706;">${diffDays} 天</span>`
        } else if (diffDays === 0) {
            subject = `[紧急] ${asset.name} 今天到期！`
            statusHtml = `状态：<span style="font-weight: bold; font-size: 1.2em; color: #DC2626;">今天到期</span>`
        } else {
            const overdueDays = Math.abs(diffDays)
            subject = `[严重过期] ${asset.name} 已过期 ${overdueDays} 天！`
            statusHtml = `状态：<span style="font-weight: bold; font-size: 1.2em; color: #DC2626;">已过期 ${overdueDays} 天</span>`
        }

        notifications.push({
          email: asset.user.email,
          assetName: asset.name,
          subject: subject,
          statusHtml: statusHtml,
          expiryDate: asset.expiry_date
        })
      }
    }

    const results = []
    if (RESEND_API_KEY) {
      for (const notification of notifications) {
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
                <p>请务必及时处理，并在系统中更新到期时间以停止此通知。</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
                <p style="font-size: 12px; color: #888;">来自 U盾/CA 提醒助手</p>
              </div>
            `
          })
        })
        results.push(await res.json())
      }
    }

    return new Response(JSON.stringify({ sent: results.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
