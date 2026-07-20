import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let email = "";
  let code = "";
  let newPassword = "";
  
  try {
    const body = await req.json();
    email = (body?.email ?? "").toString().trim();
    code = (body?.code ?? "").toString().trim();
    newPassword = (body?.newPassword ?? "").toString();
  } catch {
    return json({ error: "invalid body" }, 400);
  }

  if (!email || !code || !newPassword) {
    return json({ error: "email, code, and newPassword are required" }, 400);
  }

  // Use service role key to query the users table securely
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Query public.users for the recovery_email and id
  const { data: userRecord, error: userError } = await adminClient
    .from("users")
    .select("id, recovery_email")
    .eq("email", email)
    .single();

  if (userError || !userRecord) {
    return json({ error: "User not found or no recovery email configured." }, 400);
  }

  const recoveryEmail = userRecord.recovery_email;
  const userId = userRecord.id;
  
  if (!recoveryEmail) {
    return json({ error: "No recovery email configured for this account." }, 400);
  }

  // Verify the OTP using the recovery email
  const { data: verifyData, error: verifyError } = await adminClient.auth.verifyOtp({
    email: recoveryEmail,
    token: code,
    type: 'recovery',
  });

  if (verifyError) {
    return json({ error: verifyError.message }, 400);
  }

  // Update the user's password using the admin API
  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (updateError) {
    return json({ error: updateError.message }, 400);
  }

  return json({ success: true, message: "Password updated successfully." });
});
