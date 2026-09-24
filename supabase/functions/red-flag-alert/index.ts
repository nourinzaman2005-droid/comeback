import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ error: "Authentication required" }, { status: 401, headers: corsHeaders });
  }

  const body = await request.json() as { testId?: string; symptoms?: string[] };
  if (!body.testId || !Array.isArray(body.symptoms) || body.symptoms.length === 0) {
    return Response.json({ error: "A test and symptoms are required" }, { status: 400, headers: corsHeaders });
  }

  const webhook = Deno.env.get("CLINICIAN_ALERT_WEBHOOK_URL");
  if (webhook) {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "comeback.symptom_reported",
        testId: body.testId,
        symptomCount: body.symptoms.length,
      }),
    });
    if (!response.ok) {
      return Response.json({ error: "Alert delivery failed" }, { status: 502, headers: corsHeaders });
    }
  }

  return Response.json({ accepted: true }, { status: 202, headers: corsHeaders });
});
