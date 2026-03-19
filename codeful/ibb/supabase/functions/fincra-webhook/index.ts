import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const FINCRA_WEBHOOK_SECRET = Deno.env.get("FINCRA_WEBHOOK_SECRET") || "";

const encoder = new TextEncoder();
const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmacSHA512(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toHex(signature);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("signature") || "";

    if (!FINCRA_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Missing webhook secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = await hmacSHA512(rawBody, FINCRA_WEBHOOK_SECRET);
    if (expected !== signature) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};
    const event = String(payload?.event || payload?.type || "").toLowerCase();
    const data = payload?.data || {};
    const status = String(data?.status || "").toLowerCase();
    const reference = data?.reference || data?.merchantReference || data?.paymentReference || payload?.reference || null;

    if (!reference) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let paymentStatus: string | null = null;
    if (event.includes("successful") || status === "successful" || status === "success") {
      paymentStatus = "paid";
    } else if (event.includes("failed") || status === "failed") {
      paymentStatus = "failed";
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: payment } = await supabase
      .from("payments")
      .select("id, order_id")
      .eq("reference", reference)
      .maybeSingle();

    let orderId = payment?.order_id || null;
    if (!orderId) {
      const { data: ord } = await supabase
        .from("orders")
        .select("id")
        .eq("payment_ref", reference)
        .maybeSingle();
      orderId = ord?.id || null;
    }

    if (payment) {
      await supabase
        .from("payments")
        .update({ status: paymentStatus || payment?.status || "pending", raw: payload })
        .eq("id", payment.id);
    } else if (orderId) {
      await supabase.from("payments").insert({
        order_id: orderId,
        provider: "fincra",
        reference,
        status: paymentStatus || "pending",
        raw: payload,
      });
    }

    if (orderId && paymentStatus) {
      const update: Record<string, string> = { payment_status: paymentStatus };
      if (paymentStatus === "paid") {
        update.status = "processing";
      }
      await supabase.from("orders").update(update).eq("id", orderId);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
