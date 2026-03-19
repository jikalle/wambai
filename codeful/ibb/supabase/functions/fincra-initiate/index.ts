import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const FINCRA_SECRET_KEY = Deno.env.get("FINCRA_SECRET_KEY") || "";
const FINCRA_PUBLIC_KEY = Deno.env.get("FINCRA_PUBLIC_KEY") || "";
const FINCRA_BASE_URL = (Deno.env.get("FINCRA_BASE_URL") || "https://sandboxapi.fincra.com").replace(/\/+$/, "");
const FINCRA_REDIRECT_URL = Deno.env.get("FINCRA_REDIRECT_URL") || "";

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
    const body = await req.json();
    const orderId = body?.orderId;
    const customer = body?.customer || {};

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!customer?.email) {
      return new Response(JSON.stringify({ error: "Missing customer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!FINCRA_SECRET_KEY || !FINCRA_PUBLIC_KEY) {
      return new Response(JSON.stringify({ error: "Fincra keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, total, currency, payment_status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: orderErr?.message || "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.payment_status === "paid") {
      return new Response(JSON.stringify({ error: "Order already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = `ord_${order.id}_${crypto.randomUUID()}`;

    const redirectUrl = FINCRA_REDIRECT_URL && /^https?:\/\//i.test(FINCRA_REDIRECT_URL)
      ? FINCRA_REDIRECT_URL
      : undefined;

    const payload: Record<string, unknown> = {
      amount: Number(order.total || 0),
      currency: order.currency || "NGN",
      customer: {
        name: customer?.name || "Customer",
        email: customer?.email,
        phoneNumber: customer?.phoneNumber || undefined,
      },
      paymentMethods: ["bank_transfer", "card", "payattitude"],
      feeBearer: "customer",
      reference,
      redirectUrl,
      metadata: {
        orderId: order.id,
      },
    };

    const fincraRes = await fetch(`${FINCRA_BASE_URL}/checkout/payments`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": FINCRA_SECRET_KEY,
        "x-pub-key": FINCRA_PUBLIC_KEY,
      },
      body: JSON.stringify(payload),
    });

    const fincraJson = await fincraRes.json();
    if (!fincraRes.ok || !fincraJson?.status) {
      const errDetail = fincraJson?.message || fincraJson?.error || JSON.stringify(fincraJson);
      return new Response(JSON.stringify({ error: errDetail || "Failed to create payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const link = fincraJson?.data?.link || null;
    const payCode = fincraJson?.data?.payCode || null;
    const responseRef = fincraJson?.data?.reference || reference;

    await supabase.from("payments").insert({
      order_id: order.id,
      provider: "fincra",
      reference: responseRef,
      pay_code: payCode,
      status: "pending",
      amount: Number(order.total || 0),
      currency: order.currency || "NGN",
      raw: fincraJson,
    });

    await supabase
      .from("orders")
      .update({ payment_ref: responseRef })
      .eq("id", order.id);

    return new Response(JSON.stringify({ link, reference: responseRef, payCode }), {
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
