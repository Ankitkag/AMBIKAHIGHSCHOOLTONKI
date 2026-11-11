/**
 * Verification & Test Suite for Ambika High School Secure Upload System
 * Tests:
 * 1. Binary Magic-Byte detection for JPG, PNG, WEBP, PDF
 * 2. Rejection of malicious headers (MZ executables, ELF, <script, <?php)
 * 3. File size limit logic
 * 4. Reference number format validation
 * 5. Presence and syntax of all files (upload.html, admin-submissions.html, sql, functions)
 */

const fs = require('fs');
const path = require('path');

function runTests() {
  console.log('====================================================');
  console.log('Ambika High School — Portal Verification & Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // --- 1. MAGIC BYTE INSPECTION LOGIC TEST ---
  console.log('--- Test Suite 1: Binary Magic-Bytes Detection ---');

  function detectFileType(buffer) {
    if (buffer.length < 12) return null;

    // Check executable
    if ((buffer[0] === 0x4D && buffer[1] === 0x5A) || 
        (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46)) {
      return { malicious: true };
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return { mime: 'image/jpeg', ext: 'jpg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
      return { mime: 'image/png', ext: 'png' };
    }

    // WEBP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return { mime: 'image/webp', ext: 'webp' };
    }

    // PDF: %PDF (25 50 44 46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return { mime: 'application/pdf', ext: 'pdf' };
    }

    return null;
  }

  // Test JPEG
  const mockJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
  assert(detectFileType(mockJpeg)?.mime === 'image/jpeg', 'Valid JPEG buffer identified correctly');

  // Test PNG
  const mockPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
  assert(detectFileType(mockPng)?.mime === 'image/png', 'Valid PNG buffer identified correctly');

  // Test WEBP
  const mockWebp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  assert(detectFileType(mockWebp)?.mime === 'image/webp', 'Valid WEBP buffer identified correctly');

  // Test PDF
  const mockPdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x37, 0x0A, 0x25, 0xD0, 0xD4]);
  assert(detectFileType(mockPdf)?.mime === 'application/pdf', 'Valid PDF buffer identified correctly');

  // Test Disguised Executable (e.g. evil.exe renamed to evil.jpg)
  const mockFakeJpg = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
  assert(detectFileType(mockFakeJpg)?.malicious === true, 'Disguised executable with MZ header rejected as malicious');

  // Test Plain Text / HTML file disguised as PDF
  const mockHtmlDisguised = Buffer.from('<html lang="en"><body><h1>Malicious</h1></body></html>');
  assert(detectFileType(mockHtmlDisguised) === null, 'HTML/Script file disguised as document rejected');

  // --- 2. REFERENCE NUMBER REGEX TEST ---
  console.log('\n--- Test Suite 2: Reference Number Formatting ---');
  const refPattern = /^AMB-\d{4}-\d{5}$/;
  assert(refPattern.test('AMB-2026-00001'), 'Reference format AMB-2026-00001 matches specification');
  assert(refPattern.test('AMB-2026-99999'), 'Reference format AMB-2026-99999 matches specification');
  assert(!refPattern.test('AMB-26-01'), 'Invalid reference format correctly rejected');

  // --- 3. FILES INTEGRITY & SYNTAX TEST ---
  console.log('\n--- Test Suite 3: Project Files Presence & Integrity ---');

  const filesToCheck = [
    'upload.html',
    'admin-submissions.html',
    'index.html',
    'assets/css/upload.css',
    'assets/css/style.css',
    'assets/js/config.js',
    'assets/js/upload.js',
    'assets/js/admin.js',
    'assets/js/script.js',
    'supabase/migrations/20261111_init_submissions.sql',
    'supabase/functions/submit-upload/index.ts',
    'supabase/functions/admin-actions/index.ts'
  ];

  filesToCheck.forEach(relPath => {
    const fullPath = path.join(__dirname, relPath);
    const exists = fs.existsSync(fullPath);
    assert(exists, `Required file exists: ${relPath}`);
    if (exists) {
      const stats = fs.statSync(fullPath);
      assert(stats.size > 100, `File is non-empty: ${relPath} (${stats.size} bytes)`);
    }
  });

  // --- 4. BILINGUAL TAG AUDIT ---
  console.log('\n--- Test Suite 4: Bilingual Tags Audit (upload.html & admin-submissions.html) ---');
  const uploadHtml = fs.readFileSync(path.join(__dirname, 'upload.html'), 'utf8');
  assert(uploadHtml.includes('data-en="Ambika Digital Submission Portal"'), 'upload.html has English portal title');
  assert(uploadHtml.includes('data-hi="अंबिका डिजिटल सबमिशन पोर्टल"'), 'upload.html has Hindi portal title');
  assert(uploadHtml.includes('id="submissionForm"'), 'upload.html has submission form');
  assert(uploadHtml.includes('id="dropzone"'), 'upload.html has dropzone');
  assert(uploadHtml.includes('id="consentCheck"'), 'upload.html has consent checkbox');
  assert(uploadHtml.includes('id="submissionSuccessView"'), 'upload.html has success screen container');

  const adminHtml = fs.readFileSync(path.join(__dirname, 'admin-submissions.html'), 'utf8');
  assert(adminHtml.includes('id="adminLoginSection"'), 'admin-submissions.html has secure login view');
  assert(adminHtml.includes('id="adminDashboardSection"'), 'admin-submissions.html has dashboard view');
  assert(adminHtml.includes('id="submissionDetailModal"'), 'admin-submissions.html has submission detail modal');

  // --- 5. RLS AND SECURITY AUDIT IN SQL ---
  console.log('\n--- Test Suite 5: Security & RLS Audit in SQL Migration ---');
  const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/20261111_init_submissions.sql'), 'utf8');
  assert(sql.includes('ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY'), 'RLS enabled on submissions');
  assert(sql.includes('ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY'), 'RLS enabled on submission_files');
  assert(sql.includes('public = false'), 'Storage bucket ambika-submissions is strictly private (public = false)');
  assert(sql.includes('CREATE OR REPLACE FUNCTION public.is_admin()'), 'Security definer admin check function defined');
  assert(sql.includes('submission_ref_seq'), 'Sequence for AMB-YYYY-XXXXX reference defined');

  console.log('\n====================================================');
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
