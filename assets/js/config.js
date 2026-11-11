/**
 * Ambika High School Tonki — Configuration
 * Ambika Digital Submission Portal & Admin Dashboard
 * 
 * Instructions:
 * 1. For live deployment, update SUPABASE_URL and SUPABASE_ANON_KEY with your project credentials.
 * 2. If using Cloudflare Turnstile, add your site key to TURNSTILE_SITE_KEY.
 * 3. Never put the Supabase Service Role Key here — it belongs ONLY in Supabase Edge Functions environment secrets!
 */

window.AMBIKA_CONFIG = {
  // Supabase Project Credentials (Public Anon Key is safe on client-side)
  SUPABASE_URL: 'https://wtdcqobyudialllycazm.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_TkrWdVZvh3s_k6oLPeNPCg_mOUbnYzx',

  // Edge Function Endpoints
  // If left as default, these automatically resolve to ${SUPABASE_URL}/functions/v1/...
  EDGE_FUNCTION_UPLOAD: '',
  EDGE_FUNCTION_ADMIN: '',

  // Storage Bucket Name (Private)
  STORAGE_BUCKET: 'ambika-submissions',

  // Cloudflare Turnstile Site Key (Optional / Recommended for spam & bot protection)
  // Set to empty string '' if not yet configured; the frontend gracefully skips or warns
  TURNSTILE_SITE_KEY: '',

  // File Upload Limits
  LIMITS: {
    MAX_FILES: 5,
    MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,   // 5 MB per image
    MAX_PDF_SIZE_BYTES: 10 * 1024 * 1024,    // 10 MB per PDF document
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_DOC_TYPES: ['application/pdf'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.pdf']
  },

  // School Reference Prefix
  REF_PREFIX: 'AMB-2026',

  // School Contact for Privacy / Data Deletion Requests
  PRIVACY_CONTACT: {
    EMAIL: 'privacy.ambikaschool@gmail.com',
    PHONE: '+91 98765 43210',
    ADDRESS: 'Tonki, Tehsil Manawar, District Dhar, Madhya Pradesh, India'
  }
};
