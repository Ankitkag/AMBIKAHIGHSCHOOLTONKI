/**
 * Ambika High School Tonki — Admin Submissions Dashboard Logic
 * Admin Authentication, Status Management, Metrics, Signed URL Generation, Filters
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const loginSection = document.getElementById('adminLoginSection');
  const dashboardSection = document.getElementById('adminDashboardSection');
  const loginForm = document.getElementById('adminLoginForm');
  const loginEmailInput = document.getElementById('adminEmail');
  const loginPassInput = document.getElementById('adminPassword');
  const loginBtn = document.getElementById('adminLoginBtn');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const adminUserEmail = document.getElementById('adminUserEmail');

  // Metric elements
  const statTotal = document.getElementById('statTotal');
  const statPending = document.getElementById('statPending');
  const statApproved = document.getElementById('statApproved');
  const statRejected = document.getElementById('statRejected');

  // Filter elements
  const searchInput = document.getElementById('adminSearchInput');
  const classFilter = document.getElementById('adminClassFilter');
  const categoryFilter = document.getElementById('adminCategoryFilter');
  const statusFilter = document.getElementById('adminStatusFilter');
  const dateFilter = document.getElementById('adminDateFilter');
  const resetFiltersBtn = document.getElementById('adminResetFiltersBtn');
  const refreshBtn = document.getElementById('adminRefreshBtn');

  // Table body
  const tableBody = document.getElementById('submissionsTableBody');
  const emptyState = document.getElementById('tableEmptyState');

  // Modal elements
  const detailModal = document.getElementById('submissionDetailModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalRef = document.getElementById('modalRef');
  const modalFullName = document.getElementById('modalFullName');
  const modalStudentName = document.getElementById('modalStudentName');
  const modalClass = document.getElementById('modalClass');
  const modalScholar = document.getElementById('modalScholar');
  const modalCategory = document.getElementById('modalCategory');
  const modalDate = document.getElementById('modalDate');
  const modalStatus = document.getElementById('modalStatus');
  const modalConsent = document.getElementById('modalConsent');
  const modalDescription = document.getElementById('modalDescription');
  const modalFilesList = document.getElementById('modalFilesList');
  const modalApproveBtn = document.getElementById('modalApproveBtn');
  const modalRejectBtn = document.getElementById('modalRejectBtn');
  const modalDeleteBtn = document.getElementById('modalDeleteBtn');

  // State
  let currentSession = null;
  let allSubmissions = [];
  let currentViewingSubmission = null;

  // Bilingual strings
  const I18N = {
    en: {
      loginSuccess: 'Signed in successfully as Administrator.',
      loginFailed: 'Invalid credentials or unauthorized account.',
      logoutSuccess: 'Signed out successfully.',
      sessionExpired: 'Your session has expired. Please log in again.',
      statusUpdated: 'Submission status updated successfully.',
      deleteConfirm: 'Are you sure you want to permanently delete this submission and all associated files? This cannot be undone.',
      deletedSuccess: 'Submission deleted permanently.',
      urlGenerated: 'Secure 60-second access link generated.',
      error: 'An error occurred. Please try again.'
    },
    hi: {
      loginSuccess: 'प्रशासक के रूप में सफलतापूर्वक साइन इन किया गया।',
      loginFailed: 'अमान्य क्रेडेंशियल्स या अनधिकृत खाता।',
      logoutSuccess: 'सफलतापूर्वक साइन आउट किया गया।',
      sessionExpired: 'आपका सत्र समाप्त हो गया है। कृपया पुनः लॉग इन करें।',
      statusUpdated: 'सबमिशन स्थिति सफलतापूर्वक अपडेट की गई।',
      deleteConfirm: 'क्या आप निश्चित रूप से इस सबमिशन और सभी संबंधित फ़ाइलों को स्थायी रूप से हटाना चाहते हैं?',
      deletedSuccess: 'सबमिशन स्थायी रूप से हटा दिया गया।',
      urlGenerated: 'सुरक्षित 60-सेकंड का एक्सेस लिंक तैयार हो गया।',
      error: 'एक त्रुटि हुई। कृपया पुन: प्रयास करें।'
    }
  };

  function getLang() {
    return localStorage.getItem('preferredLang') || document.documentElement.lang || 'en';
  }

  function t(key) {
    const lang = getLang();
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }

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

    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
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
  // Supabase Auth Integration
  // --------------------------------------------------------------------------
  const cfg = window.AMBIKA_CONFIG || {};

  function isSupabaseConfigured() {
    return cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
           cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON');
  }

  async function checkExistingAuth() {
    const savedToken = localStorage.getItem('ambika_admin_token');
    const savedEmail = localStorage.getItem('ambika_admin_email');

    // If live Supabase is configured, purge old mock token and check real session
    if (isSupabaseConfigured()) {
      if (savedToken === 'mock-admin-token-12345') {
        localStorage.removeItem('ambika_admin_token');
        localStorage.removeItem('ambika_admin_email');
        showLogin();
        return;
      }

      if (window.supabase) {
        try {
          const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
          const { data: { session } } = await sb.auth.getSession();
          if (session) {
            currentSession = { token: session.access_token, user: session.user };
            localStorage.setItem('ambika_admin_token', session.access_token);
            localStorage.setItem('ambika_admin_email', session.user.email);
            showDashboard(session.user.email);
            loadSubmissions();
            return;
          }
        } catch (e) {
          console.warn('Session check err:', e);
        }
      }
    }

    if (savedToken && savedEmail) {
      currentSession = { token: savedToken, user: { email: savedEmail } };
      showDashboard(savedEmail);
      loadSubmissions();
    } else {
      showLogin();
    }
  }

  function showLogin() {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
  }

  function showDashboard(email) {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    if (adminUserEmail) adminUserEmail.textContent = email;
  }

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginEmailInput.value.trim();
      const password = loginPassInput.value;

      loginBtn.disabled = true;
      loginBtn.textContent = 'Verifying...';

      if (!isSupabaseConfigured()) {
        // Mock Admin Login Mode
        if (email.toLowerCase().includes('admin') || password.length >= 6) {
          currentSession = { token: 'mock-admin-token-12345', user: { email } };
          localStorage.setItem('ambika_admin_token', 'mock-admin-token-12345');
          localStorage.setItem('ambika_admin_email', email);
          showToast(t('loginSuccess'), 'success');
          showDashboard(email);
          loadSubmissions();
        } else {
          showToast(t('loginFailed'), 'error');
        }
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In to Portal';
        return;
      }

      // Live Supabase Auth using Supabase SDK
      try {
        if (window.supabase) {
          const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
          const { data, error } = await sb.auth.signInWithPassword({ email, password });

          if (error) {
            showToast(error.message || t('loginFailed'), 'error');
            return;
          }

          if (data?.session) {
            currentSession = { token: data.session.access_token, user: data.user };
            localStorage.setItem('ambika_admin_token', data.session.access_token);
            localStorage.setItem('ambika_admin_email', email);
            showToast(t('loginSuccess'), 'success');
            showDashboard(email);
            loadSubmissions();
            return;
          }
        }
      } catch (err) {
        showToast(err.message || t('error'), 'error');
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In to Portal';
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (isSupabaseConfigured() && window.supabase) {
        try {
          const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
          await sb.auth.signOut();
        } catch (e) {}
      }
      localStorage.removeItem('ambika_admin_token');
      localStorage.removeItem('ambika_admin_email');
      currentSession = null;
      allSubmissions = [];
      showToast(t('logoutSuccess'), 'info');
      showLogin();
    });
  }

  // --------------------------------------------------------------------------
  // Data Fetching: Submissions & Metrics
  // --------------------------------------------------------------------------
  async function loadSubmissions() {
    if (!isSupabaseConfigured()) {
      allSubmissions = getMockSubmissions();
      updateMetrics();
      renderTable();
      return;
    }

    // Direct Supabase Query
    if (window.supabase) {
      try {
        const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        const { data, error } = await sb
          .from('submissions')
          .select('*, files:submission_files(*)')
          .order('created_at', { ascending: false });

        if (!error && data) {
          allSubmissions = data;
          updateMetrics();
          renderTable();
          return;
        } else if (error) {
          console.error('Supabase query error:', error);
          showToast(error.message, 'error');
        }
      } catch (err) {
        console.error('Direct query fallback error:', err);
      }
    }

    allSubmissions = [];
    updateMetrics();
    renderTable();
  }

  function updateMetrics() {
    const total = allSubmissions.length;
    const pending = allSubmissions.filter(s => s.submission_status === 'Pending').length;
    const approved = allSubmissions.filter(s => s.submission_status === 'Approved').length;
    const rejected = allSubmissions.filter(s => s.submission_status === 'Rejected').length;

    if (statTotal) statTotal.textContent = total;
    if (statPending) statPending.textContent = pending;
    if (statApproved) statApproved.textContent = approved;
    if (statRejected) statRejected.textContent = rejected;
  }

  // --------------------------------------------------------------------------
  // Table Rendering & Filters
  // --------------------------------------------------------------------------
  function filterSubmissions() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    const cls = classFilter?.value || 'All';
    const cat = categoryFilter?.value || 'All';
    const st = statusFilter?.value || 'All';
    const dt = dateFilter?.value || '';

    return allSubmissions.filter(item => {
      // Search
      const matchSearch = !query ||
        item.submission_reference.toLowerCase().includes(query) ||
        (item.full_name && item.full_name.toLowerCase().includes(query)) ||
        (item.student_name && item.student_name.toLowerCase().includes(query)) ||
        (item.scholar_number && item.scholar_number.toLowerCase().includes(query));

      // Class
      const matchClass = (cls === 'All') || (item.class_name === cls);

      // Category
      const matchCat = (cat === 'All') || (item.category === cat);

      // Status
      const matchStatus = (st === 'All') || (item.submission_status === st);

      // Date
      let matchDate = true;
      if (dt) {
        const itemDateStr = new Date(item.created_at).toISOString().split('T')[0];
        matchDate = (itemDateStr === dt);
      }

      return matchSearch && matchClass && matchCat && matchStatus && matchDate;
    });
  }

  function renderTable() {
    const filtered = filterSubmissions();
    tableBody.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    filtered.forEach(sub => {
      const tr = document.createElement('tr');

      const dateStr = new Date(sub.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      let badgeClass = 'badge-pending';
      if (sub.submission_status === 'Approved') badgeClass = 'badge-approved';
      if (sub.submission_status === 'Rejected') badgeClass = 'badge-rejected';

      const fileCount = (sub.files && sub.files.length) || (sub.file_count || 1);

      tr.innerHTML = `
        <td><strong style="color: #102B50; font-family: monospace;">${sub.submission_reference}</strong></td>
        <td>${dateStr}</td>
        <td>${sub.full_name || '—'}</td>
        <td>${sub.student_name ? `${sub.student_name} (${sub.class_name || 'N/A'})` : (sub.class_name || '—')}</td>
        <td>${sub.category}</td>
        <td>📁 ${fileCount}</td>
        <td><span class="status-badge ${badgeClass}">${sub.submission_status}</span></td>
        <td>
          <button class="btn-action-view" data-id="${sub.id}">View Details</button>
        </td>
      `;

      tr.querySelector('.btn-action-view').addEventListener('click', () => {
        openDetailModal(sub);
      });

      tableBody.appendChild(tr);
    });
  }

  // Filter Listeners
  if (searchInput) searchInput.addEventListener('input', renderTable);
  if (classFilter) classFilter.addEventListener('change', renderTable);
  if (categoryFilter) categoryFilter.addEventListener('change', renderTable);
  if (statusFilter) statusFilter.addEventListener('change', renderTable);
  if (dateFilter) dateFilter.addEventListener('change', renderTable);

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      classFilter.value = 'All';
      categoryFilter.value = 'All';
      statusFilter.value = 'All';
      dateFilter.value = '';
      renderTable();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadSubmissions();
      showToast('Dashboard refreshed.', 'info');
    });
  }

  // --------------------------------------------------------------------------
  // Detail Modal & File Signed URL Actions
  // --------------------------------------------------------------------------
  function openDetailModal(sub) {
    currentViewingSubmission = sub;

    modalRef.textContent = sub.submission_reference;
    modalFullName.textContent = sub.full_name || '—';
    modalStudentName.textContent = sub.student_name || '—';
    modalClass.textContent = sub.class_name || '—';
    modalScholar.textContent = sub.scholar_number || '—';
    modalCategory.textContent = sub.category || '—';
    modalDate.textContent = new Date(sub.created_at).toLocaleString();
    modalStatus.textContent = sub.submission_status;
    modalConsent.textContent = sub.consent_status ? '✅ Yes (Parent/Guardian)' : '❌ Not recorded';
    modalDescription.textContent = sub.description || 'No description provided.';

    // Populate files
    modalFilesList.innerHTML = '';
    const files = sub.files || sub.mock_files || [
      {
        id: '1',
        original_filename: 'uploaded_document.pdf',
        file_size: 1420500,
        file_type: 'application/pdf',
        storage_path: 'submissions/2026-11/sample.pdf'
      }
    ];

    files.forEach(f => {
      const card = document.createElement('div');
      card.className = 'modal-file-card';

      const isPdf = f.file_type === 'application/pdf';
      const icon = isPdf ? '📄' : '🖼️';
      const sizeStr = (f.file_size / (1024 * 1024)).toFixed(2) + ' MB';

      card.innerHTML = `
        <div class="modal-file-left">
          <span class="modal-file-icon">${icon}</span>
          <div>
            <div class="modal-file-name">${f.original_filename}</div>
            <div class="modal-file-size">${sizeStr} &bull; ${f.file_type}</div>
          </div>
        </div>
        <button class="btn-secure-view" data-path="${f.storage_path}">
          🔒 Secure 60s Link
        </button>
      `;

      card.querySelector('.btn-secure-view').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const path = btn.getAttribute('data-path');
        await fetchSignedUrl(path, btn);
      });

      modalFilesList.appendChild(card);
    });

    detailModal.classList.add('active');
  }

  function closeDetailModal() {
    detailModal.classList.remove('active');
    currentViewingSubmission = null;
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeDetailModal);

  // Request Short-Lived Signed URL
  async function fetchSignedUrl(storagePath, buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = 'Generating...';

    if (!isSupabaseConfigured()) {
      setTimeout(() => {
        buttonEl.disabled = false;
        buttonEl.textContent = '🔒 Secure 60s Link';
        showToast('In mock mode: in production this generates a 60-second time-limited signed URL for private bucket access.', 'info');
      }, 500);
      return;
    }

    // Try direct Supabase client signed URL creation
    if (window.supabase) {
      try {
        const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        const { data, error } = await sb.storage
          .from('ambika-submissions')
          .createSignedUrl(storagePath, 60);

        if (!error && data?.signedUrl) {
          showToast(t('urlGenerated'), 'success');
          window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
          buttonEl.disabled = false;
          buttonEl.textContent = '🔒 Secure 60s Link';
          return;
        }
      } catch (err) {
        console.warn('Direct signed URL error:', err);
      }
    }

    try {
      const endpoint = cfg.EDGE_FUNCTION_ADMIN;
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession?.token}`,
            'apikey': cfg.SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            action: 'get_signed_url',
            storage_path: storagePath
          })
        });

        const data = await res.json();
        if (res.ok && data.signedUrl) {
          showToast(t('urlGenerated'), 'success');
          window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        } else {
          showToast(data.error || 'Failed to generate signed URL', 'error');
        }
      }
    } catch (err) {
      showToast(err.message || t('error'), 'error');
    } finally {
      buttonEl.disabled = false;
      buttonEl.textContent = '🔒 Secure 60s Link';
    }
  }

  // Approve Action
  if (modalApproveBtn) {
    modalApproveBtn.addEventListener('click', async () => {
      if (!currentViewingSubmission) return;
      await updateStatus(currentViewingSubmission.id, 'Approved');
    });
  }

  // Reject Action
  if (modalRejectBtn) {
    modalRejectBtn.addEventListener('click', async () => {
      if (!currentViewingSubmission) return;
      await updateStatus(currentViewingSubmission.id, 'Rejected');
    });
  }

  // Delete Action
  if (modalDeleteBtn) {
    modalDeleteBtn.addEventListener('click', async () => {
      if (!currentViewingSubmission) return;
      if (!confirm(t('deleteConfirm'))) return;
      await deleteSubmission(currentViewingSubmission.id);
    });
  }

  async function updateStatus(id, newStatus) {
    if (!isSupabaseConfigured()) {
      const sub = allSubmissions.find(s => s.id === id);
      if (sub) sub.submission_status = newStatus;
      showToast(t('statusUpdated'), 'success');
      updateMetrics();
      renderTable();
      closeDetailModal();
      return;
    }

    // Direct Supabase update
    if (window.supabase) {
      try {
        const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        const { error } = await sb.from('submissions').update({ submission_status: newStatus }).eq('id', id);
        if (!error) {
          const sub = allSubmissions.find(s => s.id === id);
          if (sub) sub.submission_status = newStatus;
          showToast(t('statusUpdated'), 'success');
          updateMetrics();
          renderTable();
          closeDetailModal();
          return;
        }
      } catch (err) {
        console.warn('Direct status update err:', err);
      }
    }

    try {
      const endpoint = cfg.EDGE_FUNCTION_ADMIN;
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession?.token}`,
            'apikey': cfg.SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            action: 'update_status',
            submission_id: id,
            status: newStatus
          })
        });

        if (res.ok) {
          const sub = allSubmissions.find(s => s.id === id);
          if (sub) sub.submission_status = newStatus;
          showToast(t('statusUpdated'), 'success');
          updateMetrics();
          renderTable();
          closeDetailModal();
        } else {
          const data = await res.json();
          showToast(data.error || t('error'), 'error');
        }
      }
    } catch (err) {
      showToast(err.message || t('error'), 'error');
    }
  }

  async function deleteSubmission(id) {
    if (!isSupabaseConfigured()) {
      allSubmissions = allSubmissions.filter(s => s.id !== id);
      showToast(t('deletedSuccess'), 'success');
      updateMetrics();
      renderTable();
      closeDetailModal();
      return;
    }

    // Direct Supabase delete
    if (window.supabase) {
      try {
        const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        const { data: files } = await sb.from('submission_files').select('storage_path').eq('submission_id', id);
        if (files && files.length > 0) {
          await sb.storage.from('ambika-submissions').remove(files.map(f => f.storage_path));
        }
        const { error } = await sb.from('submissions').delete().eq('id', id);
        if (!error) {
          allSubmissions = allSubmissions.filter(s => s.id !== id);
          showToast(t('deletedSuccess'), 'success');
          updateMetrics();
          renderTable();
          closeDetailModal();
          return;
        }
      } catch (err) {
        console.warn('Direct delete error:', err);
      }
    }

    try {
      const endpoint = cfg.EDGE_FUNCTION_ADMIN;
      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession?.token}`,
            'apikey': cfg.SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            action: 'delete',
            submission_id: id
          })
        });

        if (res.ok) {
          allSubmissions = allSubmissions.filter(s => s.id !== id);
          showToast(t('deletedSuccess'), 'success');
          updateMetrics();
          renderTable();
          closeDetailModal();
        } else {
          const data = await res.json();
          showToast(data.error || t('error'), 'error');
        }
      }
    } catch (err) {
      showToast(err.message || t('error'), 'error');
    }
  }

  // --------------------------------------------------------------------------
  // Mock Data for Instant Interactive Testing
  // --------------------------------------------------------------------------
  function getMockSubmissions() {
    return [
      {
        id: 'sub-001',
        submission_reference: 'AMB-2026-00001',
        full_name: 'Rajesh Sharma',
        student_name: 'Aarav Sharma',
        class_name: 'Class 5',
        scholar_number: 'AHS-2022-441',
        category: 'Student Project',
        description: 'Science fair solar system model documentation and presentation chart.',
        consent_status: true,
        submission_status: 'Approved',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        mock_files: [
          { original_filename: 'solar_project_chart.jpg', file_size: 2450000, file_type: 'image/jpeg', storage_path: 'submissions/2026-11/mock1.jpg' },
          { original_filename: 'project_report.pdf', file_size: 1890000, file_type: 'application/pdf', storage_path: 'submissions/2026-11/mock2.pdf' }
        ]
      },
      {
        id: 'sub-002',
        submission_reference: 'AMB-2026-00002',
        full_name: 'Pooja Patel',
        student_name: 'Ananya Patel',
        class_name: 'Class 8',
        scholar_number: 'AHS-2019-112',
        category: 'Certificate',
        description: 'District level Hindi debate competition merit certificate.',
        consent_status: true,
        submission_status: 'Pending',
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
        mock_files: [
          { original_filename: 'debate_merit_cert.pdf', file_size: 3200000, file_type: 'application/pdf', storage_path: 'submissions/2026-11/mock3.pdf' }
        ]
      },
      {
        id: 'sub-003',
        submission_reference: 'AMB-2026-00003',
        full_name: 'Virendra Chouhan',
        student_name: 'Daksh Chouhan',
        class_name: 'Class 3',
        scholar_number: 'AHS-2024-890',
        category: 'Student Photograph',
        description: 'School sports day sprint race participation photo.',
        consent_status: true,
        submission_status: 'Pending',
        created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
        mock_files: [
          { original_filename: 'sports_day_sprint.jpg', file_size: 3800000, file_type: 'image/jpeg', storage_path: 'submissions/2026-11/mock4.jpg' }
        ]
      },
      {
        id: 'sub-004',
        submission_reference: 'AMB-2026-00004',
        full_name: 'Sunil Solanki',
        student_name: 'Meera Solanki',
        class_name: 'Class 10',
        scholar_number: 'AHS-2017-024',
        category: 'Homework',
        description: 'Mathematics trigonometry assignment term-1 submission.',
        consent_status: true,
        submission_status: 'Rejected',
        rejection_reason: 'Pages 3 and 4 were blurry and unreadable.',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        mock_files: [
          { original_filename: 'math_assignment.pdf', file_size: 4500000, file_type: 'application/pdf', storage_path: 'submissions/2026-11/mock5.pdf' }
        ]
      }
    ];
  }

  // Initial Check
  checkExistingAuth();
});
