// ============================================================================
// AMBIKA HIGH SCHOOL TONKI — SECURE ADMIN ACTIONS EDGE FUNCTION
// File: supabase/functions/admin-actions/index.ts
// Platform: Supabase Edge Functions (Deno runtime)
// Description: Admin authentication, metrics, filtered submissions list,
//              short-lived signed URL generation, status approval & deletion.
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify Authorization Header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify user is in admin_users and active
    const { data: adminRecord, error: adminCheckError } = await supabaseAdmin
      .from("admin_users")
      .select("id, role, is_active, full_name, email")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (adminCheckError || !adminRecord) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You do not have administrator permissions." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse action and payload
    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const url = new URL(req.url);
    const action = body.action || url.searchParams.get("action");

    // ------------------------------------------------------------------------
    // Action: 'stats' (Dashboard metric counters)
    // ------------------------------------------------------------------------
    if (action === "stats") {
      const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
        supabaseAdmin.from("submissions").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("submissions").select("*", { count: "exact", head: true }).eq("submission_status", "Pending"),
        supabaseAdmin.from("submissions").select("*", { count: "exact", head: true }).eq("submission_status", "Approved"),
        supabaseAdmin.from("submissions").select("*", { count: "exact", head: true }).eq("submission_status", "Rejected"),
      ]);

      return new Response(
        JSON.stringify({
          stats: {
            total: totalRes.count || 0,
            pending: pendingRes.count || 0,
            approved: approvedRes.count || 0,
            rejected: rejectedRes.count || 0,
          },
          admin: {
            email: adminRecord.email,
            name: adminRecord.full_name,
            role: adminRecord.role,
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ------------------------------------------------------------------------
    // Action: 'list' (Filtered submissions with attached files)
    // ------------------------------------------------------------------------
    if (action === "list") {
      const page = parseInt(body.page || url.searchParams.get("page") || "1", 10);
      const pageSize = parseInt(body.pageSize || url.searchParams.get("pageSize") || "20", 10);
      const search = (body.search || url.searchParams.get("search") || "").trim();
      const className = body.class_name || url.searchParams.get("class_name") || "";
      const category = body.category || url.searchParams.get("category") || "";
      const status = body.status || url.searchParams.get("status") || "";
      const startDate = body.start_date || url.searchParams.get("start_date") || "";
      const endDate = body.end_date || url.searchParams.get("end_date") || "";

      let query = supabaseAdmin
        .from("submissions")
        .select("*, files:submission_files(*)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (status && status !== "All") {
        query = query.eq("submission_status", status);
      }
      if (className && className !== "All") {
        query = query.eq("class_name", className);
      }
      if (category && category !== "All") {
        query = query.eq("category", category);
      }
      if (startDate) {
        query = query.gte("created_at", new Date(startDate).toISOString());
      }
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endD.toISOString());
      }
      if (search) {
        query = query.or(
          `submission_reference.ilike.%${search}%,full_name.ilike.%${search}%,student_name.ilike.%${search}%,scholar_number.ilike.%${search}%`
        );
      }

      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);

      const { data, count, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          submissions: data || [],
          total: count || 0,
          page,
          pageSize,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ------------------------------------------------------------------------
    // Action: 'get_signed_url' (Create short-lived 60s private signed URL)
    // ------------------------------------------------------------------------
    if (action === "get_signed_url") {
      const storagePath = body.storage_path;
      if (!storagePath) {
        return new Response(JSON.stringify({ error: "Missing storage_path" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 60-second expiration for maximum security
      const expiresInSeconds = 60;
      const { data, error } = await supabaseAdmin.storage
        .from("ambika-submissions")
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Failed to generate secure URL" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ signedUrl: data.signedUrl, expiresIn: expiresInSeconds }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ------------------------------------------------------------------------
    // Action: 'update_status' (Approve or Reject)
    // ------------------------------------------------------------------------
    if (action === "update_status") {
      const { submission_id, status: newStatus, rejection_reason } = body;

      if (!submission_id || !["Approved", "Rejected", "Pending"].includes(newStatus)) {
        return new Response(JSON.stringify({ error: "Invalid submission_id or status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabaseAdmin
        .from("submissions")
        .update({
          submission_status: newStatus,
          rejection_reason: rejection_reason || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submission_id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, submission: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------------------------------------------------------------------------
    // Action: 'delete' (Delete files from storage bucket & remove DB record)
    // ------------------------------------------------------------------------
    if (action === "delete") {
      const { submission_id } = body;
      if (!submission_id) {
        return new Response(JSON.stringify({ error: "Missing submission_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch all storage paths for this submission
      const { data: files } = await supabaseAdmin
        .from("submission_files")
        .select("storage_path")
        .eq("submission_id", submission_id);

      if (files && files.length > 0) {
        const paths = files.map((f: any) => f.storage_path);
        await supabaseAdmin.storage.from("ambika-submissions").remove(paths);
      }

      // Delete the submission row (submission_files deleted cascade)
      const { error } = await supabaseAdmin
        .from("submissions")
        .delete()
        .eq("id", submission_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action requested" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Admin actions error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
