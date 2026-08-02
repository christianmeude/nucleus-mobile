import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ENABLE_EMAIL_DISPATCH = Deno.env.get("ENABLE_EMAIL_DISPATCH") === "true";

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record || !['approval', 'revision_required', 'rejection', 'review_request'].includes(record.type)) {
      return new Response(JSON.stringify({ message: "Ignored notification type" }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Idempotency check: try to claim the notification
    const { data: updatedNotification, error: updateError } = await supabase
      .from('notifications')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', record.id)
      .is('notified_at', null)
      .select()
      .single();

    if (updateError || !updatedNotification) {
      return new Response(JSON.stringify({ message: "Already processed or not found" }), { status: 200 });
    }

    // Fetch user details for email
    const { data: user } = await supabase
      .from('users')
      .select('email, first_name')
      .eq('id', record.user_id)
      .single();

    // Fetch push tokens
    const { data: pushTokens } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', record.user_id);

    // 1. Send Push Notifications via Expo
    const expoTokens = pushTokens?.map(pt => pt.expo_push_token) || [];
    if (expoTokens.length > 0) {
      const pushPayload = {
        to: expoTokens,
        sound: 'default',
        title: record.title,
        body: record.message,
        data: { researchId: record.research_id },
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushPayload),
      }).catch(err => console.error("Expo Push Error:", err));
    }

    // 2. Send Email via Resend (guarded by ENABLE_EMAIL_DISPATCH)
    if (ENABLE_EMAIL_DISPATCH && RESEND_API_KEY && user?.email) {
      const htmlContent = `
        <p>Hi ${user.first_name || 'there'},</p>
        <p>${record.message}</p>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `notification-${record.id}`
        },
        body: JSON.stringify({
          from: 'Notifications <noreply@nu-dasma.edu.ph>',
          to: [user.email],
          subject: record.title,
          html: htmlContent
        }),
      }).catch(err => console.error("Resend Email Error:", err));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing notification:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
