// ============================================================================
// AMBIKA HIGH SCHOOL TONKI — SECURE PUBLIC UPLOAD EDGE FUNCTION
// File: supabase/functions/submit-upload/index.ts
// Platform: Supabase Edge Functions (Deno runtime)
// Description: Validates inputs, rate limits, verifies magic bytes,
//              uploads to private storage, and records submission.
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Standard CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Allowed MIME types & file limits
const MAX_FILES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PDF_SIZE = 10 * 1024 * 1024;  // 10 MB

const ALLOWED_CLASSES = [
  "Nursery", "LKG", "UKG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"
];

const ALLOWED_CATEGORIES = [
  "Student Project",
  "Homework",
  "School Activity",
  "Student Photograph",
  "Certificate",
  "Other"
];

interface DetectedFileType {
  mime: string;
  ext: string;
  isImage: boolean;
  isPdf: boolean;
}

/**
 * Validates actual binary signatures (magic bytes)
 */
function detectFileTypeFromMagicBytes(bytes: Uint8Array): DetectedFileType | null {
  if (bytes.length < 12) return null;

  // 1. JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { mime: "image/jpeg", ext: "jpg", isImage: true, isPdf: false };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
    bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
  ) {
    return { mime: "image/png", ext: "png", isImage: true, isPdf: false };
  }

  // 3. WEBP: RIFF....WEBP (52 49 46 46 at 0..3 and 57 45 42 50 at 8..11)
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp", isImage: true, isPdf: false };
  }

  // 4. PDF: %PDF (25 50 44 46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { mime: "application/pdf", ext: "pdf", isImage: false, isPdf: true };
  }

  return null;
}

/**
 * Checks for malicious patterns (e.g. scripts or executable headers)
 */
function containsMaliciousSignature(bytes: Uint8Array): boolean {
  // Reject Windows PE executable ('MZ' -> 0x4D 0x5A)
  if (bytes[0] === 0x4D && bytes[1] === 0x5A) return true;
  // Reject Linux ELF executable ('\x7FELF' -> 0x7F 0x45 0x4C 0x46)
  if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) return true;

  // Scan first 512 bytes for script / HTML tags
  const headerText = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 512)).toLowerCase();
  if (
    headerText.includes("<script") ||
    headerText.includes("<?php") ||
    headerText.includes("<html") ||
    headerText.includes("<!doctype") ||
    headerText.includes("onload=") ||
    headerText.includes("onerror=")
  ) {
    return true;
  }

  return false;
}

/**
 * Cloudflare Turnstile verification
 */
async function verifyTurnstileToken(token: string, ip: string, secretKey: string): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });
    const outcome = await res.json();
    return outcome.success === true;
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return false;
  }
}

/**
 * Simple client IP hash generator
 */
async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + (Deno.env.get("IP_SALT") || "ambika-school-tonki-salt"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

serve(async (req: Request) => {
  // Handle CORS preflight
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Extract client IP
    const clientIp = req.headers.get("cf-connecting-ip") ||
                     req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
                     req.headers.get("x-real-ip") ||
                     "unknown-ip";

    const ipHashed = await hashIp(clientIp);

    // 1. Rate limiting check (Max 10 submissions per 10 minutes per IP)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: rateData, error: rateError } = await supabaseAdmin
      .from("rate_limits")
      .select("request_count, first_request, last_request")
      .eq("ip_hash", ipHashed)
      .eq("endpoint", "submit-upload")
      .maybeSingle();

    if (rateData) {
      if (new Date(rateData.first_request) > new Date(tenMinutesAgo)) {
        if (rateData.request_count >= 10) {
          return new Response(
            JSON.stringify({
              error: "Rate limit exceeded. Please wait a few minutes before submitting again.",
              error_hi: "सीमा पार हो गई है। कृपया पुनः प्रयास करने से पहले कुछ मिनट प्रतीक्षा करें।"
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        await supabaseAdmin
          .from("rate_limits")
          .update({ request_count: rateData.request_count + 1, last_request: new Date().toISOString() })
          .eq("ip_hash", ipHashed)
          .eq("endpoint", "submit-upload");
      } else {
        // Reset window
        await supabaseAdmin
          .from("rate_limits")
          .update({ request_count: 1, first_request: new Date().toISOString(), last_request: new Date().toISOString() })
          .eq("ip_hash", ipHashed)
          .eq("endpoint", "submit-upload");
      }
    } else {
      await supabaseAdmin.from("rate_limits").insert({
        ip_hash: ipHashed,
        endpoint: "submit-upload",
        request_count: 1,
      });
    }

    // 2. Parse multipart form data
    const formData = await req.formData();

    // 3. Honeypot check for bots
    const honeypot = formData.get("hp_field");
    if (honeypot && String(honeypot).trim() !== "") {
      console.warn("Spam bot trapped by honeypot field");
      return new Response(JSON.stringify({ error: "Spam submission rejected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Cloudflare Turnstile token check (if secret key configured)
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    const turnstileToken = formData.get("cf-turnstile-response");
    if (turnstileSecret && turnstileSecret.trim() !== "") {
      if (!turnstileToken || !(await verifyTurnstileToken(String(turnstileToken), clientIp, turnstileSecret))) {
        return new Response(
          JSON.stringify({
            error: "Security verification failed. Please complete the CAPTCHA.",
            error_hi: "सुरक्षा सत्यापन विफल हुआ। कृपया पुनः प्रयास करें।"
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Form fields validation
    const fullName = String(formData.get("full_name") || "").trim();
    const studentName = String(formData.get("student_name") || "").trim();
    const className = String(formData.get("class_name") || "").trim();
    const scholarNumber = String(formData.get("scholar_number") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const consentValue = formData.get("consent");
    const consent = consentValue === "true" || consentValue === "on" || consentValue === "1";

    if (!fullName || fullName.length < 2 || fullName.length > 120) {
      return new Response(
        JSON.stringify({
          error: "Full Name is required and must be between 2 and 120 characters.",
          error_hi: "पूरा नाम आवश्यक है (2 से 120 वर्ण)।"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (className && !ALLOWED_CLASSES.includes(className)) {
      return new Response(
        JSON.stringify({ error: "Invalid class selected.", error_hi: "अमान्य कक्षा चुनी गई।" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return new Response(
        JSON.stringify({ error: "Please select a valid submission category.", error_hi: "कृपया एक मान्य श्रेणी चुनें।" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!consent) {
      return new Response(
        JSON.stringify({
          error: "Parent / Guardian consent is required for submission.",
          error_hi: "जमा करने के लिए अभिभावक की सहमति अनिवार्य है।"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Extract and validate files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file") && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ error: "Please select at least one file to upload.", error_hi: "कृपया कम से कम एक फ़ाइल चुनें।" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (files.length > MAX_FILES) {
      return new Response(
        JSON.stringify({
          error: `Maximum ${MAX_FILES} files allowed per submission.`,
          error_hi: `अधिकतम ${MAX_FILES} फ़ाइलें ही स्वीकार्य हैं।`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process and validate each file binary
    interface ValidatedUpload {
      buffer: Uint8Array;
      originalName: string;
      detectedType: DetectedFileType;
      size: number;
      storagePath: string;
    }

    const validatedUploads: ValidatedUpload[] = [];
    const dateObj = new Date();
    const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = new Uint8Array(await file.arrayBuffer());
      const size = buffer.byteLength;

      // Check size
      if (size === 0) {
        return new Response(
          JSON.stringify({ error: `File "${file.name}" is empty.`, error_hi: `फ़ाइल "${file.name}" खाली है।` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check magic bytes
      const detected = detectFileTypeFromMagicBytes(buffer);
      if (!detected) {
        return new Response(
          JSON.stringify({
            error: `File "${file.name}" has an unsupported format or corrupted header. Allowed: JPG, PNG, WEBP, PDF.`,
            error_hi: `फ़ाइल "${file.name}" का प्रारूप अमान्य है। केवल JPG, PNG, WEBP और PDF मान्य हैं।`
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check maximum size per format
      if (detected.isImage && size > MAX_IMAGE_SIZE) {
        return new Response(
          JSON.stringify({
            error: `Image "${file.name}" exceeds the 5 MB limit (${(size / (1024 * 1024)).toFixed(1)} MB).`,
            error_hi: `छवि "${file.name}" 5 MB की सीमा से बड़ी है।`
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (detected.isPdf && size > MAX_PDF_SIZE) {
        return new Response(
          JSON.stringify({
            error: `PDF document "${file.name}" exceeds the 10 MB limit (${(size / (1024 * 1024)).toFixed(1)} MB).`,
            error_hi: `दस्तावेज़ "${file.name}" 10 MB की सीमा से बड़ा है।`
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for executable or script headers
      if (containsMaliciousSignature(buffer)) {
        console.warn(`Rejected malicious file payload: ${file.name}`);
        return new Response(
          JSON.stringify({
            error: `File "${file.name}" was rejected for security reasons.`,
            error_hi: `सुरक्षा कारणों से फ़ाइल "${file.name}" अस्वीकृत कर दी गई।`
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate random server-side filename (never use client-supplied path)
      const randomUuid = crypto.randomUUID();
      const storagePath = `submissions/${yearMonth}/${randomUuid}.${detected.ext}`;

      // Sanitize original filename for display record
      const cleanOriginalName = file.name
        .replace(/[^a-zA-Z0-9._\-\s]/g, "")
        .substring(0, 100) || `upload_${i + 1}.${detected.ext}`;

      validatedUploads.push({
        buffer,
        originalName: cleanOriginalName,
        detectedType: detected,
        size,
        storagePath,
      });
    }

    // 7. Insert submission record into database
    const { data: submissionRow, error: submissionError } = await supabaseAdmin
      .from("submissions")
      .insert({
        full_name: fullName,
        student_name: studentName || null,
        class_name: className || null,
        scholar_number: scholarNumber || null,
        category,
        description: description || null,
        consent_status: consent,
        submission_status: "Pending",
        ip_hash: ipHashed,
      })
      .select("id, submission_reference, created_at")
      .single();

    if (submissionError || !submissionRow) {
      console.error("Database insert error:", submissionError);
      return new Response(
        JSON.stringify({ error: "Failed to record submission in database", details: submissionError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const submissionId = submissionRow.id;
    const submissionRef = submissionRow.submission_reference;

    // 8. Upload files to private Supabase Storage bucket 'ambika-submissions'
    const uploadedFileRecords = [];

    for (const item of validatedUploads) {
      const { error: uploadError } = await supabaseAdmin.storage
        .from("ambika-submissions")
        .upload(item.storagePath, item.buffer, {
          contentType: item.detectedType.mime,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        // Rollback: delete submission record
        await supabaseAdmin.from("submissions").delete().eq("id", submissionId);
        return new Response(
          JSON.stringify({ error: "Failed to store file securely. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      uploadedFileRecords.push({
        submission_id: submissionId,
        storage_path: item.storagePath,
        original_filename: item.originalName,
        file_type: item.detectedType.mime,
        file_size: item.size,
      });
    }

    // 9. Insert file records
    const { error: filesDbError } = await supabaseAdmin
      .from("submission_files")
      .insert(uploadedFileRecords);

    if (filesDbError) {
      console.error("Files table insert error:", filesDbError);
    }

    // 10. Return success response with reference number
    return new Response(
      JSON.stringify({
        success: true,
        reference: submissionRef,
        message: "Your files have been submitted successfully.",
        message_hi: "आपकी फाइलें सफलतापूर्वक जमा कर दी गई हैं।",
        files_count: validatedUploads.length,
        created_at: submissionRow.created_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Unexpected handler exception:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
