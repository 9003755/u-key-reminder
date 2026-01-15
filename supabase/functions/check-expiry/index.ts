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
    // 1. Get all assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select(`
        *,
        user:user_id (
          email
        )
      `)
    
    if (assetsError) throw assetsError

    // 2. Get all profiles for notification settings
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

      if (notifyDays.includes(diffDays)) {
        notifications.push({
          email: asset.user.email,
          assetName: asset.name,
          daysLeft: diffDays,
          expiryDate: asset.expiry_date
        })
      }
    }

    // 3. Send emails via Resend
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
            from: 'U盾提醒助手 <onboarding@resend.dev>', // Default testing sender
            to: notification.email,
            subject: `[提醒] ${notification.assetName} 还有 ${notification.daysLeft} 天到期`,
            html: `
              <h1>资产到期提醒</h1>
              <p>您好，</p>
              <p>您的资产 <strong>${notification.assetName}</strong> 即将于 <strong>${notification.expiryDate}</strong> 到期。</p>
              <p>剩余天数：<span style="color: red; font-weight: bold;">${notification.daysLeft} 天</span></p>
              <p>请及时处理续费。</p>
            `
          })
        })
        results.push(await res.json())
      }
    } else {
      console.log('Skipping email sending: RESEND_API_KEY not found')
    }

    return new Response(
      JSON.stringify({ 
        message: `Checked ${assets.length} assets. Sent ${results.length} notifications.`,
        details: results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
