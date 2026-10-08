// supabase/functions/initialize-payment/index.ts
//
// Starts a Paystack transaction and returns the hosted checkout URL.
// FIX: explicitly lists which payment channels Paystack should offer,
// with "card" listed first. Without this, Paystack falls back to
// whatever channels are enabled/ordered in your dashboard, which is
// why checkout was opening straight to the Bank Transfer screen
// instead of showing Card as an option up front.

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

    const {
      email,
      amount_naira,
      subaccount_code,
      charge_platform_fee,
      fee_amount,
      order_id,
      reference,
      callback_url,
    } = await req.json();

    if (!email || !amount_naira) {
      throw new Error("email and amount_naira are required");
    }

    const amountKobo = Math.round(Number(amount_naira) * 100);

    const payload: Record<string, unknown> = {
      email,
      amount: amountKobo,
      currency: "NGN",
      // Show all of Paystack's payment methods, with Card first, so
      // customers land on Card instead of Bank Transfer by default.
      channels: ["card", "bank", "ussd", "qr", "bank_transfer", "mobile_money"],
      metadata: { order_id },
    };

    if (reference) payload.reference = reference;
    if (callback_url) payload.callback_url = callback_url;

    if (subaccount_code) {
      payload.subaccount = subaccount_code;
      if (charge_platform_fee) {
        // Platform fee now comes from the client, which reads it from
        // site_settings (the admin's global fee), instead of being
        // hardcoded here. Falls back to ₦100 if not provided.
        const feeNaira = fee_amount !== undefined && fee_amount !== null ? Number(fee_amount) : 100;
        payload.transaction_charge = Math.round(feeNaira * 100); // naira -> kobo
        payload.bearer = "account"; // the subaccount (organizer) bears the fee deduction
      }
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!result.status) {
      throw new Error(result.message || "Failed to initialize Paystack transaction");
    }

    return new Response(
      JSON.stringify({
        authorization_url: result.data.authorization_url,
        reference: result.data.reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});