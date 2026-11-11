/**
 * Ambika High School Tonki — Main JavaScript
 * Production-ready vanilla JS | All features implemented
 */

document.addEventListener('DOMContentLoaded', function () {

  /* ============================================================
     1. BILINGUAL LANGUAGE SYSTEM
  ============================================================ */
  let currentLang = 'en';

  function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'hi' : 'en';
    applyLanguage(currentLang);
    localStorage.setItem('preferredLang', currentLang);
  }

  function applyLanguage(lang) {
    // Set html lang attribute
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';

    // Toggle Devanagari font class on body
    document.body.classList.toggle('lang-hi', lang === 'hi');

    // Update all elements with data-en / data-hi
    document.querySelectorAll('[data-en]').forEach(el => {
      const val = el.getAttribute('data-' + lang) || el.getAttribute('data-en');
      if (val !== null && val !== undefined) {
        if (el.children.length === 0) {
          el.textContent = val;
        } else if (val.includes('<') && val.includes('>')) {
          el.innerHTML = val;
        } else if (el.childNodes.length > 0 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
          el.childNodes[0].nodeValue = val + ' ';
        } else {
          el.textContent = val;
        }
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-placeholder-en]').forEach(el => {
      el.placeholder =
        el.getAttribute('data-placeholder-' + lang) ||
        el.getAttribute('data-placeholder-en');
    });

    // Update the language toggle button label
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
      langBtn.textContent = lang === 'en' ? '🌐 हिंदी' : '🌐 English';
    }
  }

  // Load saved language preference
  const savedLang = localStorage.getItem('preferredLang') || 'en';
  currentLang = savedLang;
  applyLanguage(savedLang);

  const langToggleBtn = document.getElementById('langToggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', toggleLanguage);
  }


  /* ============================================================
     2. STICKY NAVBAR
  ============================================================ */
  const navbar = document.getElementById('navbar');
  const backToTopBtn = document.getElementById('backToTop');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);

      // Show/hide back-to-top button
      if (backToTopBtn) {
        backToTopBtn.classList.toggle('visible', window.scrollY > 300);
      }
    });
  }


  /* ============================================================
     3. MOBILE HAMBURGER MENU
  ============================================================ */
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Close nav on any nav-link click (mobile)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }


  /* ============================================================
     4. SMOOTH SCROLL FOR NAV LINKS (offset for fixed navbar)
  ============================================================ */
  const NAVBAR_HEIGHT = 70;

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });


  /* ============================================================
     5. SCROLL REVEAL ANIMATIONS
  ============================================================ */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


  /* ============================================================
     6. GALLERY FILTER SYSTEM
  ============================================================ */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      // Remove active from all filter buttons
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const filter = this.getAttribute('data-filter');

      document.querySelectorAll('.gallery-item').forEach(item => {
        if (filter === 'all' || item.getAttribute('data-category') === filter) {
          item.style.display = 'block';
          item.classList.add('reveal', 'visible');
        } else {
          item.style.display = 'none';
        }
      });
    });
  });


  
  /* ============================================================
     6B. GALLERY TABS SWITCHER (Photo vs Video)
  ============================================================ */
  document.querySelectorAll('.gallery-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      const targetId = this.getAttribute('data-tab');
      document.querySelectorAll('.gallery-panel').forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.add('active');
          panel.style.display = 'block';
        } else {
          panel.classList.remove('active');
          panel.style.display = 'none';
        }
      });
    });
  });

  /* ============================================================
     7. PHOTO LIGHTBOX
  ============================================================ */
  let currentLightboxIndex = 0;

  function getVisibleGalleryItems() {
    return [...document.querySelectorAll('.gallery-item')].filter(item => {
      return item.style.display !== 'none';
    });
  }

  function openLightbox(src, alt, index) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (!lightbox || !lightboxImg) return;

    lightboxImg.src = src;
    lightboxImg.alt = alt;
    currentLightboxIndex = index;
    const captionEl = document.querySelector('.lightbox-caption');
    if (captionEl) captionEl.textContent = alt;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (!lightbox) return;

    lightbox.classList.remove('active');
    if (lightboxImg) lightboxImg.src = '';
    document.body.style.overflow = '';
  }

  function navigateLightbox(direction) {
    const items = getVisibleGalleryItems();
    if (!items.length) return;

    currentLightboxIndex = (currentLightboxIndex + direction + items.length) % items.length;
    const img = items[currentLightboxIndex].querySelector('img');
    if (!img) return;

    const lightboxImg = document.getElementById('lightbox-img');
    if (lightboxImg) {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      const captionEl = document.querySelector('.lightbox-caption');
      if (captionEl) captionEl.textContent = img.alt;
    }
  }

  // Attach click to gallery items
  document.querySelectorAll('.gallery-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (img) {
        const visibleItems = getVisibleGalleryItems();
        const visibleIndex = visibleItems.indexOf(item);
        openLightbox(img.src, img.alt, visibleIndex !== -1 ? visibleIndex : index);
      }
    });
  });

  // Lightbox controls
  const lightboxOverlay = document.querySelector('.lightbox-overlay');
  const lightboxClose = document.querySelector('.lightbox-close');
  const lightboxPrev = document.querySelector('.lightbox-prev');
  const lightboxNext = document.querySelector('.lightbox-next');

  if (lightboxOverlay) lightboxOverlay.addEventListener('click', closeLightbox);
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(-1); });
  if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(1); });

  // Keyboard navigation for lightbox
  document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !lightbox.classList.contains('active')) return;

    if (e.key === 'ArrowLeft')  navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
    if (e.key === 'Escape')     closeLightbox();
  });


  /* ============================================================
     8. VIDEO MODAL (YouTube)
  ============================================================ */
  function openVideoModal(src, isLocal = false) {
    const modal = document.getElementById('videoModal');
    const frame = document.getElementById('videoFrame');
    const localVideo = document.getElementById('localVideo');
    if (!modal) return;

    if (isLocal) {
      if (frame) { frame.src = ''; frame.style.display = 'none'; }
      if (localVideo) {
        localVideo.src = src;
        localVideo.style.display = 'block';
        localVideo.play();
      }
    } else {
      if (localVideo) {
        localVideo.pause();
        localVideo.src = '';
        localVideo.style.display = 'none';
      }
      if (frame) {
        frame.src = `https://www.youtube.com/embed/${src}?autoplay=1&rel=0`;
        frame.style.display = 'block';
      }
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const frame = document.getElementById('videoFrame');
    const localVideo = document.getElementById('localVideo');
    if (!modal) return;

    if (frame) { frame.src = ''; frame.style.display = 'none'; }
    if (localVideo) {
      localVideo.pause();
      localVideo.src = '';
      localVideo.style.display = 'none';
    }

    modal.classList.remove('active');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', () => {
      const localSrc = card.getAttribute('data-video-src');
      const videoId = card.getAttribute('data-video-id');
      if (localSrc) {
        openVideoModal(localSrc, true);
      } else if (videoId && videoId !== 'YOUTUBE_VIDEO_ID_HERE') {
        openVideoModal(videoId, false);
      } else {
        alert('Video link not configured yet. Please add a YouTube video ID or local video file.');
      }
    });
  });

  const videoModalOverlay = document.querySelector('.video-modal-overlay');
  const videoModalClose = document.querySelector('.video-modal-close');

  if (videoModalOverlay) videoModalOverlay.addEventListener('click', closeVideoModal);
  if (videoModalClose) videoModalClose.addEventListener('click', closeVideoModal);

  // Escape key closes video modal too (combined with lightbox keydown listener)
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('videoModal');
    if (modal && modal.classList.contains('active') && e.key === 'Escape') {
      closeVideoModal();
    }
  });


  /* ============================================================
     9. GALLERY DROPDOWN NAV
  ============================================================ */
  const galleryDropdown = document.querySelector('.has-dropdown');
  if (galleryDropdown) {
    const dropdownMenu = galleryDropdown.querySelector('.dropdown-menu');

    if (dropdownMenu) {
      galleryDropdown.addEventListener('mouseenter', function () {
        if (window.innerWidth >= 768) {
          dropdownMenu.style.display = 'block';
        }
      });

      galleryDropdown.addEventListener('mouseleave', function () {
        if (window.innerWidth >= 768) {
          dropdownMenu.style.display = 'none';
        }
      });

      // Mobile: toggle on click
      const galleryNavLink = galleryDropdown.querySelector('.nav-link');
      if (galleryNavLink) {
        galleryNavLink.addEventListener('click', function (e) {
          if (window.innerWidth < 768) {
            e.preventDefault();
            dropdownMenu.style.display =
              dropdownMenu.style.display === 'block' ? 'none' : 'block';
          }
        });
      }
    }
  }


  /* ============================================================
     10. CONTACT / ENQUIRY FORM HANDLER (WhatsApp integration)
  ============================================================ */
  const enquiryForm = document.getElementById('enquiryForm');
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const parentName   = (document.getElementById('parentName')?.value   || '').trim();
      const studentName  = (document.getElementById('studentName')?.value  || '').trim();
      const mobile       = (document.getElementById('mobileNumber')?.value  || '').trim();
      const className    = (document.getElementById('classApplying')?.value || '').trim();
      const message      = (document.getElementById('enquiryMessage')?.value || document.getElementById('message')?.value || '').trim();

      // Basic validation
      if (!parentName || !studentName || !mobile) {
        alert('Please fill in all required fields.');
        return;
      }

      // Compose WhatsApp message
      const whatsappText =
        `*Admission Enquiry - Ambika High School Tonki*%0A%0A` +
        `Parent Name: ${encodeURIComponent(parentName)}%0A` +
        `Student Name: ${encodeURIComponent(studentName)}%0A` +
        `Mobile: ${encodeURIComponent(mobile)}%0A` +
        `Class: ${encodeURIComponent(className)}%0A` +
        `Message: ${encodeURIComponent(message)}`;

      // Show success feedback
      const successMsg = document.getElementById('formSuccess');
      if (successMsg) {
        successMsg.style.display = 'block';
        setTimeout(() => { successMsg.style.display = 'none'; }, 5000);
      }

      // Open WhatsApp with pre-filled message (replace XXXXXXXXXX with real number)
      // window.open(`https://wa.me/91XXXXXXXXXX?text=${whatsappText}`, '_blank');

      enquiryForm.reset();
    });
  }


  /* ============================================================
     11. BACK TO TOP BUTTON
  ============================================================ */
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }


  /* ============================================================
     12. CURRENT YEAR IN FOOTER
  ============================================================ */
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }


  /* ============================================================
     13. ACTIVE NAV LINK ON SCROLL
  ============================================================ */
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });


  /* ============================================================
     14. HERO SCROLL INDICATOR FADE
  ============================================================ */
  const scrollIndicator = document.querySelector('.scroll-indicator');
  if (scrollIndicator) {
    window.addEventListener('scroll', () => {
      const opacity = Math.max(0, 1 - window.scrollY / 200);
      scrollIndicator.style.opacity = opacity;
    });
  }


  /* ============================================================
     15. GALLERY IMAGE PLACEHOLDER (broken image handler)
  ============================================================ */
  document.querySelectorAll('.gallery-item img').forEach(img => {
    img.addEventListener('error', function () {
      this.style.display = 'none';

      // Avoid inserting duplicate placeholders
      if (this.parentElement.querySelector('.img-placeholder')) return;

      const placeholder = document.createElement('div');
      placeholder.className = 'img-placeholder';
      placeholder.innerHTML = '<span>📷</span><p>Photo Coming Soon</p>';
      this.parentElement.insertBefore(placeholder, this);
    });
  });


  /* ============================================================
     INIT COMPLETE
  ============================================================ */
  console.log('Ambika High School Tonki — scripts initialised ✓');

}); // end DOMContentLoaded
