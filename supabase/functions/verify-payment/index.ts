// supabase/functions/verify-payment/index.ts
//
// Called by payment.html the moment the customer lands back from Paystack.
// Asks Paystack directly "did this transaction actually succeed?" and
// updates the order immediately — so confirmation doesn't depend on the
// webhook having fired yet (webhooks can be delayed, or your webhook URL
// might not be set for the right mode yet). The webhook stays in place
// as a second, independent way the same update can happen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not set");

    const { reference } = await req.json();
    if (!reference) throw new Error("reference is required");

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const verifyData = await verifyRes.json();

    if (!verifyData.status) {
      throw new Error(verifyData.message || "Could not verify transaction");
    }

    const paystackStatus = verifyData.data.status; // "success" | "failed" | "abandoned"
    const newStatus =
      paystackStatus === "success" ? "success" :
      paystackStatus === "abandoned" ? "pending" :
      "failed";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: updated, error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        confirmed_at: newStatus === "success" ? new Date().toISOString() : null,
      })
      .eq("paystack_ref", reference)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ status: newStatus, order: updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});