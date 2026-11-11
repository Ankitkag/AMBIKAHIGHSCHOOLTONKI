/**
 * Ambika High School Tonki — Digital Submission Portal Frontend
 * Secure File Upload Logic, Magic-Byte Binary Validation, Bilingual Support
 */

document.addEventListener('DOMContentLoaded', () => {
  // References
  const form = document.getElementById('submissionForm');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const previewList = document.getElementById('filePreviewList');
  const submitBtn = document.getElementById('submitBtn');
  const progressContainer = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const progressPercent = document.getElementById('progressPercent');
  const successView = document.getElementById('submissionSuccessView');
  const formContainer = document.getElementById('formContainer');
  const refDisplay = document.getElementById('refNumberDisplay');
  const copyRefBtn = document.getElementById('copyRefBtn');
  const submitAnotherBtn = document.getElementById('submitAnotherBtn');

  // Global Config Reference
  const cfg = window.AMBIKA_CONFIG || {};

  // Stored validated files
  let selectedFiles = []; // Array of { file: File, previewUrl: string, typeInfo: Object, isValid: boolean }

  // Bilingual translation dictionary for notifications & errors
  const I18N = {
    en: {
      fileCountExceeded: 'Maximum 5 files allowed per submission.',
      fileDuplicate: 'This file has already been added.',
      imageOversized: 'Image exceeds the 5 MB limit.',
      pdfOversized: 'PDF document exceeds the 10 MB limit.',
      magicBytesInvalid: 'File signature invalid or corrupted. Supported: JPG, PNG, WEBP, PDF.',
      executableDetected: 'Security error: Executable or script files are strictly prohibited.',
      fileAdded: 'File added and verified successfully.',
      fillRequired: 'Please fill in all required fields.',
      consentRequired: 'Parent / Guardian consent is required.',
      noFiles: 'Please add at least one valid photo or PDF file.',
      uploading: 'Uploading securely to Ambika School vault...',
      uploadSuccess: 'Files submitted successfully!',
      uploadError: 'Submission failed. Please check your connection and try again.',
      copied: 'Reference number copied to clipboard!',
      copyFailed: 'Failed to copy reference number.'
    },
    hi: {
      fileCountExceeded: 'प्रति सबमिशन अधिकतम 5 फ़ाइलें ही स्वीकार्य हैं।',
      fileDuplicate: 'यह फ़ाइल पहले ही जोड़ी जा चुकी है।',
      imageOversized: 'छवि का आकार 5 MB की सीमा से अधिक है।',
      pdfOversized: 'PDF दस्तावेज़ का आकार 10 MB की सीमा से अधिक है।',
      magicBytesInvalid: 'फ़ाइल का प्रारूप अमान्य है। केवल JPG, PNG, WEBP और PDF समर्थित हैं।',
      executableDetected: 'सुरक्षा त्रुटि: निष्पादन योग्य (executable) फ़ाइलें प्रतिबंधित हैं।',
      fileAdded: 'फ़ाइल सफलतापूर्वक सत्यापित और जोड़ी गई।',
      fillRequired: 'कृपया सभी आवश्यक फ़ील्ड भरें।',
      consentRequired: 'अभिभावक की सहमति अनिवार्य है।',
      noFiles: 'कृपया कम से कम एक वैध फ़ोटो या PDF फ़ाइल जोड़ें।',
      uploading: 'अंबिका स्कूल सुरक्षित वॉल्ट में अपलोड हो रहा है...',
      uploadSuccess: 'फाइलें सफलतापूर्वक जमा कर दी गईं!',
      uploadError: 'सबमिशन विफल हुआ। कृपया पुनः प्रयास करें।',
      copied: 'संदर्भ संख्या क्लिपबोर्ड पर कॉपी हो गई!',
      copyFailed: 'कॉपी करने में विफल।'
    }
  };

  function getLang() {
    return localStorage.getItem('preferredLang') || document.documentElement.lang || 'en';
  }

  function t(key) {
    const lang = getLang();
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }

  // --------------------------------------------------------------------------
  // Toast Notification System
  // --------------------------------------------------------------------------
  function showToast(message, type = 'info', title = '') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    if (type === 'warning') icon = '🔔';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4500);
  }

  // --------------------------------------------------------------------------
  // Binary Magic-Byte Inspection
  // --------------------------------------------------------------------------
  async function inspectFileMagicBytes(file) {
    return new Promise((resolve) => {
      const slice = file.slice(0, 16);
      const reader = new FileReader();

      reader.onloadend = () => {
        if (!reader.result || !(reader.result instanceof ArrayBuffer)) {
          return resolve({ valid: false, reason: 'Read failed' });
        }

        const bytes = new Uint8Array(reader.result);
        if (bytes.length < 4) {
          return resolve({ valid: false, reason: 'File too small or empty' });
        }

        // 1. Check for malicious executable headers: MZ (0x4D, 0x5A) or ELF (0x7F, 0x45, 0x4C, 0x46)
        if (bytes[0] === 0x4D && bytes[1] === 0x5A) {
          return resolve({ valid: false, isExecutable: true, reason: 'Executable signature (MZ)' });
        }
        if (bytes[0] === 0x7F && bytes[1] === 0x45 && bytes[2] === 0x4C && bytes[3] === 0x46) {
          return resolve({ valid: false, isExecutable: true, reason: 'ELF binary signature' });
        }

        // 2. JPEG: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
          return resolve({
            valid: true,
            mime: 'image/jpeg',
            ext: 'jpg',
            label: 'Verified JPEG',
            isImage: true,
            isPdf: false
          });
        }

        // 3. PNG: 89 50 4E 47 0D 0A 1A 0A
        if (
          bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
          bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
        ) {
          return resolve({
            valid: true,
            mime: 'image/png',
            ext: 'png',
            label: 'Verified PNG',
            isImage: true,
            isPdf: false
          });
        }

        // 4. WEBP: RIFF....WEBP (52 49 46 46 at 0..3 and 57 45 42 50 at 8..11)
        if (
          bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
          bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
        ) {
          return resolve({
            valid: true,
            mime: 'image/webp',
            ext: 'webp',
            label: 'Verified WEBP',
            isImage: true,
            isPdf: false
          });
        }

        // 5. PDF: %PDF (25 50 44 46)
        if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
          return resolve({
            valid: true,
            mime: 'application/pdf',
            ext: 'pdf',
            label: 'Verified PDF',
            isImage: false,
            isPdf: true
          });
        }

        // Unsupported signature
        return resolve({ valid: false, reason: 'Unsupported binary header' });
      };

      reader.onerror = () => resolve({ valid: false, reason: 'File read error' });
      reader.readAsArrayBuffer(slice);
    });
  }

  // Format bytes for display
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // --------------------------------------------------------------------------
  // File Ingestion & Validation
  // --------------------------------------------------------------------------
  async function processFiles(newFiles) {
    const limits = window.AMBIKA_CONFIG?.LIMITS || {
      MAX_FILES: 5,
      MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
      MAX_PDF_SIZE_BYTES: 10 * 1024 * 1024
    };

    if (selectedFiles.length + newFiles.length > limits.MAX_FILES) {
      showToast(t('fileCountExceeded'), 'error');
      return;
    }

    for (const file of newFiles) {
      // Check duplicate
      const isDuplicate = selectedFiles.some(f => f.file.name === file.name && f.file.size === file.size);
      if (isDuplicate) {
        showToast(`"${file.name}": ${t('fileDuplicate')}`, 'warning');
        continue;
      }

      // Check binary magic bytes
      const result = await inspectFileMagicBytes(file);

      if (!result.valid) {
        if (result.isExecutable) {
          showToast(`"${file.name}": ${t('executableDetected')}`, 'error');
        } else {
          showToast(`"${file.name}": ${t('magicBytesInvalid')}`, 'error');
        }
        continue;
      }

      // Check size restrictions
      if (result.isImage && file.size > limits.MAX_IMAGE_SIZE_BYTES) {
        showToast(`"${file.name}": ${t('imageOversized')}`, 'error');
        continue;
      }

      if (result.isPdf && file.size > limits.MAX_PDF_SIZE_BYTES) {
        showToast(`"${file.name}": ${t('pdfOversized')}`, 'error');
        continue;
      }

      // Generate local thumbnail preview
      let previewUrl = null;
      if (result.isImage) {
        previewUrl = URL.createObjectURL(file);
      }

      selectedFiles.push({
        file,
        previewUrl,
        typeInfo: result,
        isValid: true
      });
    }

    renderPreviewList();
  }

  // Render preview cards
  function renderPreviewList() {
    previewList.innerHTML = '';

    if (selectedFiles.length === 0) {
      previewList.style.display = 'none';
      return;
    }

    previewList.style.display = 'flex';

    selectedFiles.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'file-preview-item';

      let thumbHtml = '';
      if (item.typeInfo.isImage && item.previewUrl) {
        thumbHtml = `<div class="file-preview-thumb"><img src="${item.previewUrl}" alt="Preview" /></div>`;
      } else {
        thumbHtml = `<div class="file-preview-thumb">📄</div>`;
      }

      card.innerHTML = `
        ${thumbHtml}
        <div class="file-preview-info">
          <div class="file-preview-name" title="${item.file.name}">${item.file.name}</div>
          <div class="file-preview-meta">
            <span>${formatFileSize(item.file.size)}</span>
            <span class="file-verified-chip">✓ ${item.typeInfo.label}</span>
          </div>
        </div>
        <button type="button" class="file-remove-btn" data-index="${index}" title="Remove file">&times;</button>
      `;

      card.querySelector('.file-remove-btn').addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        removeFile(idx);
      });

      previewList.appendChild(card);
    });
  }

  function removeFile(index) {
    if (selectedFiles[index]?.previewUrl) {
      URL.revokeObjectURL(selectedFiles[index].previewUrl);
    }
    selectedFiles.splice(index, 1);
    renderPreviewList();
  }

  // --------------------------------------------------------------------------
  // Drag and Drop Listeners
  // --------------------------------------------------------------------------
  if (dropzone && fileInput) {
    // Click dropzone to trigger hidden file input
    dropzone.addEventListener('click', (e) => {
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(Array.from(e.target.files));
        fileInput.value = ''; // Reset input to allow re-selecting same file if deleted
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        processFiles(Array.from(dt.files));
      }
    });
  }

  // --------------------------------------------------------------------------
  // Form Submission
  // --------------------------------------------------------------------------
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('fullName')?.value.trim();
      const studentName = document.getElementById('studentName')?.value.trim();
      const className = document.getElementById('className')?.value;
      const scholarNumber = document.getElementById('scholarNumber')?.value.trim();
      const category = document.getElementById('category')?.value;
      const description = document.getElementById('description')?.value.trim();
      const consent = document.getElementById('consentCheck')?.checked;
      const honeypot = document.getElementById('hpField')?.value;

      // 1. Client-side checks
      if (!fullName || !category) {
        showToast(t('fillRequired'), 'error');
        return;
      }

      if (!consent) {
        showToast(t('consentRequired'), 'error');
        return;
      }

      if (selectedFiles.length === 0) {
        showToast(t('noFiles'), 'error');
        return;
      }

      // Check honeypot
      if (honeypot) {
        console.warn('Bot trapped by honeypot');
        return;
      }

      // 2. Prepare payload
      const formData = new FormData();
      formData.append('full_name', fullName);
      if (studentName) formData.append('student_name', studentName);
      if (className) formData.append('class_name', className);
      if (scholarNumber) formData.append('scholar_number', scholarNumber);
      formData.append('category', category);
      if (description) formData.append('description', description);
      formData.append('consent', consent ? 'true' : 'false');

      // Turnstile CAPTCHA response if widget loaded
      const turnstileResp = document.querySelector('[name="cf-turnstile-response"]')?.value;
      if (turnstileResp) {
        formData.append('cf-turnstile-response', turnstileResp);
      }

      // Append files
      selectedFiles.forEach((item, index) => {
        formData.append(`file_${index}`, item.file, item.file.name);
      });

      // 3. UI Loading & Progress
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      progressContainer.classList.add('active');
      progressFill.style.width = '15%';
      progressPercent.textContent = '15%';

      // 4. Destination URL resolution
      let endpoint = cfg.EDGE_FUNCTION_UPLOAD;

      if (!endpoint) {
        if (cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
          endpoint = `${cfg.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/submit-upload`;
        }
      }

      try {
        // If Supabase URL is not yet configured, provide a realistic mock simulation mode
        if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
          console.warn('Supabase credentials not yet replaced in assets/js/config.js. Running in simulated mode.');
          await simulateUpload();
          return;
        }

        // Try Edge Function first if configured
        if (cfg.EDGE_FUNCTION_UPLOAD) {
          try {
            await executeLiveUpload(cfg.EDGE_FUNCTION_UPLOAD, formData, cfg.SUPABASE_ANON_KEY);
            return;
          } catch (efErr) {
            console.warn('Edge function unavailable, falling back to direct Supabase upload:', efErr);
          }
        }

        // Direct Supabase Client Upload (Works immediately with Supabase API)
        await executeDirectSupabaseUpload({
          fullName,
          studentName,
          className,
          scholarNumber,
          category,
          description,
          consent
        });

      } catch (err) {
        console.error('Submission error:', err);
        showToast(err.message || t('uploadError'), 'error');
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        progressContainer.classList.remove('active');
      }
    });
  }

  // Direct Supabase Upload (Robust fallback when Edge Function is not deployed)
  async function executeDirectSupabaseUpload(payload) {
    if (!window.supabase) {
      throw new Error('Supabase client library not loaded. Please check your internet connection.');
    }

    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

    progressFill.style.width = '30%';
    progressPercent.textContent = '30%';

    const dateObj = new Date();
    const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    const submissionId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : ('sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));

    const randomSeq = String(Math.floor(10000 + Math.random() * 90000));
    const generatedRef = `AMB-${dateObj.getFullYear()}-${randomSeq}`;

    // 1. Insert into public.submissions (without .select to satisfy anon RLS)
    const { error: subError } = await sb
      .from('submissions')
      .insert({
        id: submissionId,
        submission_reference: generatedRef,
        full_name: payload.fullName,
        student_name: payload.studentName || null,
        class_name: payload.className || null,
        scholar_number: payload.scholarNumber || null,
        category: payload.category,
        description: payload.description || null,
        consent_status: payload.consent,
        submission_status: 'Pending'
      });

    if (subError) {
      console.error('Database insertion error:', subError);
      throw new Error(subError.message || 'Database error recording submission');
    }

    progressFill.style.width = '60%';
    progressPercent.textContent = '60%';

    // 2. Upload files to private storage bucket 'ambika-submissions'
    const fileRecords = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const item = selectedFiles[i];
      const randomFileUuid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : ('file_' + Math.random().toString(36).substring(2, 10));

      const storagePath = `submissions/${yearMonth}/${randomFileUuid}.${item.typeInfo.ext}`;

      const { error: uploadError } = await sb.storage
        .from('ambika-submissions')
        .upload(storagePath, item.file, {
          contentType: item.typeInfo.mime,
          upsert: false
        });

      if (uploadError) {
        console.error('File storage upload error:', uploadError);
        throw new Error(uploadError.message || 'Failed to upload file to storage');
      }

      fileRecords.push({
        submission_id: submissionId,
        storage_path: storagePath,
        original_filename: item.file.name,
        file_type: item.typeInfo.mime,
        file_size: item.file.size
      });
    }

    progressFill.style.width = '85%';
    progressPercent.textContent = '85%';

    // 3. Insert file records
    if (fileRecords.length > 0) {
      const { error: filesErr } = await sb.from('submission_files').insert(fileRecords);
      if (filesErr) console.warn('Files record warning:', filesErr);
    }

    progressFill.style.width = '100%';
    progressPercent.textContent = '100%';

    setTimeout(() => {
      handleUploadSuccess(generatedRef);
    }, 300);
  }

  // Live upload with real progress tracking
  function executeLiveUpload(endpoint, formData, anonKey) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);

      if (anonKey && !anonKey.includes('YOUR_SUPABASE_ANON')) {
        xhr.setRequestHeader('apikey', anonKey);
        xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 90);
          progressFill.style.width = `${percent}%`;
          progressPercent.textContent = `${percent}%`;
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            progressFill.style.width = '100%';
            progressPercent.textContent = '100%';
            setTimeout(() => {
              handleUploadSuccess(data.reference);
              resolve(data);
            }, 300);
          } catch (e) {
            reject(new Error('Invalid response from upload server'));
          }
        } else {
          let errDetail = 'Upload failed';
          try {
            const errJson = JSON.parse(xhr.responseText);
            const isHi = getLang() === 'hi';
            errDetail = (isHi && errJson.error_hi) || errJson.error || errDetail;
          } catch {}
          reject(new Error(errDetail));
        }
      };

      xhr.onerror = () => reject(new Error('Network error connecting to upload service'));
      xhr.send(formData);
    });
  }

  // Simulated upload fallback (for testing before Supabase backend keys are pasted)
  async function simulateUpload() {
    for (let p = 20; p <= 90; p += 25) {
      await new Promise(r => setTimeout(r, 200));
      progressFill.style.width = `${p}%`;
      progressPercent.textContent = `${p}%`;
    }

    await new Promise(r => setTimeout(r, 400));
    progressFill.style.width = '100%';
    progressPercent.textContent = '100%';

    // Generate simulated reference
    const randomSeq = String(Math.floor(1000 + Math.random() * 9000)).padStart(5, '0');
    const mockRef = `AMB-2026-${randomSeq}`;

    setTimeout(() => {
      handleUploadSuccess(mockRef, true);
    }, 400);
  }

  // Success Handler
  function handleUploadSuccess(referenceNumber, isSimulated = false) {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    progressContainer.classList.remove('active');

    // Hide form, show success screen
    formContainer.style.display = 'none';
    successView.classList.add('active');
    refDisplay.textContent = referenceNumber;

    if (isSimulated) {
      showToast('Uploaded in demo/test mode (Configure Supabase keys in assets/js/config.js for live storage)', 'warning');
    } else {
      showToast(t('uploadSuccess'), 'success');
    }

    // Scroll smoothly to top of portal
    window.scrollTo({ top: 120, behavior: 'smooth' });
  }

  // --------------------------------------------------------------------------
  // Copy Reference Number & Reset Form
  // --------------------------------------------------------------------------
  if (copyRefBtn && refDisplay) {
    copyRefBtn.addEventListener('click', async () => {
      const refText = refDisplay.textContent.trim();
      try {
        await navigator.clipboard.writeText(refText);
        showToast(t('copied'), 'success');
      } catch (err) {
        showToast(t('copyFailed'), 'error');
      }
    });
  }

  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener('click', () => {
      // Clean up previews
      selectedFiles.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      selectedFiles = [];

      // Reset form fields
      form.reset();
      renderPreviewList();
      progressFill.style.width = '0%';
      progressPercent.textContent = '0%';

      // Switch views
      successView.classList.remove('active');
      formContainer.style.display = 'block';

      // Scroll smoothly back
      window.scrollTo({ top: 120, behavior: 'smooth' });
    });
  }
});
