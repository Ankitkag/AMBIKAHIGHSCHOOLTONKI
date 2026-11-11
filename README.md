# AMBIKA HIGH SCHOOL TONKI – Official School Website

> **"Learn Today. Lead Tomorrow."**  
> **"आज सीखें, कल नेतृत्व करें।"**

A premium, modern, responsive, and bilingual website built for **Ambika High School Tonki**, located in Tonki, Madhya Pradesh, India. Designed to deliver an elegant digital presence with international-school aesthetics while staying fully lightweight, accessible, and 100% compatible with **GitHub Pages**.

---

## 🌟 Key Features

### 📸 Authentic School Media Integrated
- **Real School Photographs:**
  - `assets/images/school-leadership-banner.jpg`: School Management & Faculty seated at formal function table with official school banner (*"अम्बिका हाई स्कूल, टोंकी, तह. मनावर, जिला-धार"*).
  - `assets/images/independence-day-parade.jpg`: Students in camouflage marching uniforms & tricolor celebration.
  - `assets/images/teachers-day-felicitation.jpg`: Traditional teacher felicitation and Guru Vandana ceremony.
  - `assets/images/students-uniform-1.jpg` & `students-uniform-2.jpg`: Students in official school uniforms on campus ground with school bus.
- **Real School Videos:**
  - `assets/videos/school-event-1.mp4`: Independence Day & School Parade celebration video.
  - `assets/videos/school-event-2.mp4`: Teacher Felicitation ceremony video.
  - Local HTML5 video playback directly supported in the interactive video modal!

### 1. Bilingual System (English & Hindi)
- Seamless, instant language switching without full-page reloading.
- Complete translation coverage: navigation, headings, paragraphs, program cards, gallery tags, form placeholders, and footer.
- Typography optimized for both scripts:
  - **English:** *Playfair Display* (Editorial headings) + *DM Sans* (Clean, modern body).
  - **Hindi:** *Noto Sans Devanagari* (Accurate, legible Devanagari rendering).
- Language preference saved in browser `localStorage`.

### 2. Design System & Brand Palette
- **Primary Navy Blue:** `#102B50` — Trust, authority, and institutional excellence.
- **Secondary Blue:** `#173B68` — Depth and balance.
- **Premium Gold:** `#D6AD68` — Achievement, warmth, and prestige.
- **Warm Background:** `#F7F5F0` — Eye-friendly editorial backdrop.
- **Crisp White:** `#FFFFFF` — Card surfaces and high contrast readability.

### 3. Website Sections
- **Header & Sticky Navigation:** School crest logo, bilingual title, smooth underline indicator, Gallery dropdown (Photo & Video), Language Switcher pill, and "Admission Enquiry" CTA.
- **Hero Section:** Full-viewport header with animated floating shapes, verified educational badges, high-resolution campus preview, and quick call-to-actions.
- **About Our School:**
  - School introduction & philosophy.
  - Vision & Mission dual cards.
  - Principal's Message with quote styling and verified editable placeholders.
  - Core Institutional Values (Excellence, Integrity, Innovation, Community).
  - 6 School Facilities with dedicated iconography (Library, Computer Lab, Sports Ground, Science Lab, Art Room, Music Room).
- **Academics Section:**
  - **Nursery to Class 6:** English Medium foundation.
  - **Class 7 to Class 10:** Hindi Medium curriculum.
  - 4 Structural pillars: Learning Environment, Academic Activities, Subjects & Curriculum, Student Development.
- **School Life:** 8 interactive cards showcasing Classroom Activities, Sports & Games, Annual Functions, Teachers Day, Festivals, Art & Craft, Student Projects, and Cultural Celebrations.
- **Photo Gallery:**
  - 18 high-resolution themed demo images with category filters (All, Classroom, Sports, Events, Festivals, Functions, Projects).
  - Fullscreen lightbox with Next / Previous image navigation, captions, and keyboard controls (`ArrowLeft`, `ArrowRight`, `Escape`).
- **Video Gallery:**
  - YouTube-compatible video cards with play overlay.
  - Modal video player supporting custom YouTube embed links.
- **Contact Us & Admission Enquiry:**
  - Verified address (Tonki, Madhya Pradesh, India).
  - One-click WhatsApp enquiry button.
  - Interactive admission enquiry form (Parent Name, Student Name, Mobile Number, Class Applying For, Message) configured with pre-composed WhatsApp enquiry workflow.
- **Footer:** School identity, quick links, curriculum summary, contact placeholders, social media placeholders, and dynamic current-year copyright.

---

## 📁 Project Structure

```text
ambika-high-school/
│
├── index.html                   # Semantic HTML5 bilingual markup
├── README.md                    # Complete documentation & deployment guide
├── update_site.py               # Automated maintenance script
├── build_css_bridge.py          # CSS alignment generator
├── update_script.py             # Script maintenance utility
│
└── assets/
    ├── css/
    │   └── style.css            # Complete design system & responsive styling
    │
    ├── js/
    │   └── script.js            # Vanilla JS (Language toggle, lightbox, tabs, modals)
    │
    ├── images/
    │   ├── logo.png             # Ambika High School Tonki seal & crest
    │   ├── favicon.ico          # Crisp multi-resolution browser favicon
    │   ├── school-building.jpg  # High-resolution campus preview image
    │   │
    │   ├── gallery/             # 18 themed gallery photos
    │   │   ├── photo-1.jpg      # Classroom Activities
    │   │   ├── photo-2.jpg      # Sports Day
    │   │   ├── photo-3.jpg      # Annual Function
    │   │   ├── ...              # (photo-4 to photo-17)
    │   │   └── photo-18.jpg     # School Assembly
    │   │
    │   └── events/              # Dedicated directory for event photography
    │
    └── videos/                  # Local video assets (if needed)
```

---

## 🚀 GitHub Pages Deployment Guide

This website is statically self-contained and requires **zero build steps, no Node.js, and no external build server**.

### Step 1: Create a GitHub Repository
1. Log into your GitHub account.
2. Click **New Repository**.
3. Name it `ambika-high-school` (or `<your-username>.github.io`).
4. Keep the repository **Public**.
5. Click **Create repository**.

### Step 2: Push the Files
Open your terminal/command prompt in this folder and run:

```bash
git init
git add .
git commit -m "Initial commit: Ambika High School Tonki complete website"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub.
2. Click **Settings** (gear icon) → **Pages** (in the left sidebar).
3. Under **Build and deployment**:
   - **Source:** Select `Deploy from a branch`.
   - **Branch:** Select `main` and folder `/ (root)`.
4. Click **Save**.
5. Within 1–2 minutes, your website will be live at:
   ```text
   https://<your-username>.github.io/<your-repo-name>/
   ```

---

## ✏️ How to Customize School Placeholders

To personalize the website with the school's official data when available, search and replace the following placeholder tokens across `index.html`:

| Placeholder Token | Description | Location in Code |
|---|---|---|
| `[SCHOOL_ESTABLISHED_YEAR]` | Year school was established | About section info card |
| `[PRINCIPAL_NAME]` | Official name of the Principal | Principal's message card |
| `[SCHOOL_PHONE_NUMBER]` | Official contact number | Contact section & Footer |
| `[SCHOOL_EMAIL_ADDRESS]` | Official school email | Contact section & Footer |
| `[WHATSAPP_NUMBER]` | 10-digit WhatsApp phone number | WhatsApp button (`https://wa.me/...`) |
| `YOUTUBE_VIDEO_ID_HERE` | YouTube video ID (e.g. `dQw4w9WgXcQ`) | `data-video-id` in Video section |

### Replacing Demo Imagery
- To replace the campus image: save your photo as `assets/images/school-building.jpg`.
- To replace the school crest/logo: save your transparent PNG as `assets/images/logo.png`.
- To replace gallery photos: replace files in `assets/images/gallery/photo-1.jpg` through `photo-18.jpg`.

---

## 🔒 Ambika Digital Submission Portal & Secure Admin Dashboard

The website includes a public, mobile-friendly file upload system and protected administrative review dashboard designed to allow students, parents, and community members to submit photos, homework, student projects, and certificates while keeping all submitted files strictly confidential.

### 🌟 Key Security Architecture

1. **Client-Side & Server-Side Binary Magic-Byte Validation**:
   - Files are validated by their actual binary headers (`Uint8Array`), rejecting spoofed extensions (e.g. executable `.exe` or scripts renamed to `.jpg`).
   - Allowed formats:
     - **JPG / JPEG** (`FF D8 FF`) — Maximum 5 MB per image.
     - **PNG** (`89 50 4E 47 0D 0A 1A 0A`) — Maximum 5 MB per image.
     - **WEBP** (`RIFF....WEBP`) — Maximum 5 MB per image.
     - **PDF** (`%PDF` / `25 50 44 46`) — Maximum 10 MB per document.
   - Executables (`MZ`, `ELF`) and script tags (`<script`, `<?php`, `<html>`) are rejected immediately.

2. **Private Storage Vault (`ambika-submissions`)**:
   - The Supabase Storage bucket is marked `public = false`.
   - Files are stored with cryptographically generated UUID paths (`submissions/YYYY-MM/<uuid>.<ext>`). User-supplied filenames are never used in storage paths.
   - Files can only be downloaded or previewed by authenticated administrators through **short-lived signed URLs** (valid for 60 seconds).

3. **Row Level Security (RLS)**:
   - Tables `submissions` and `submission_files` reject all anonymous direct reads, inserts, updates, and deletes.
   - Public submissions are processed exclusively through the secure Supabase Edge Function (`submit-upload`), which validates inputs, checks honeypots, rate-limits requests, and performs atomic insertion.
   - Only verified administrators in `public.admin_users` can view submissions or generate signed access links.

4. **Rate Limiting & Spam Protection**:
   - Anti-bot invisible honeypot field.
   - Cloudflare Turnstile CAPTCHA integration.
   - IP-based rate limiting (maximum 10 submissions per 10 minutes per IP).

---

### 🚀 Step-by-Step Backend Setup (Supabase)

#### Step 1: Create a Supabase Project
1. Log in to [Supabase](https://supabase.com) and click **New Project**.
2. Name your project (e.g., `ambika-school-vault`) and set a strong database password.
3. Select your preferred region (e.g., `ap-south-1` Mumbai for India).

#### Step 2: Run Database Migration
1. In the Supabase Dashboard, go to the **SQL Editor**.
2. Open `supabase/migrations/20261111_init_submissions.sql` from this repository.
3. Paste the contents into the SQL Editor and click **Run**.
4. This automatically creates:
   - `submissions` table
   - `submission_files` table
   - `admin_users` table
   - `rate_limits` table
   - `submission_ref_seq` (generating references like `AMB-2026-00001`)
   - Private bucket `ambika-submissions`
   - Strict Row Level Security policies

#### Step 3: Create and Enroll School Administrator
1. In the Supabase Dashboard, navigate to **Authentication** &rarr; **Users** &rarr; **Add User** (Create User).
2. Enter the administrator's official email (e.g., `admin@ambikaschool.in`) and a secure password.
3. Go back to the **SQL Editor** and run:
   ```sql
   SELECT public.enroll_admin('admin@ambikaschool.in', 'School Principal / Head Admin');
   ```

#### Step 4: Deploy Supabase Edge Functions
Make sure the [Supabase CLI](https://supabase.com/docs/guides/cli) is installed or deploy via GitHub Actions:
```bash
# Login to Supabase CLI
supabase login

# Link your local project
supabase link --project-ref <your-supabase-project-id>

# Deploy the Edge Functions
supabase functions deploy submit-upload --no-verify-jwt
supabase functions deploy admin-actions
```

#### Step 5: Set Environment Secrets in Supabase
In Supabase Dashboard &rarr; **Settings** &rarr; **Edge Functions** (or via CLI):
```bash
# Secrets are managed safely on the server side
supabase secrets set IP_SALT="your-custom-salt-string"
# If using Cloudflare Turnstile:
supabase secrets set TURNSTILE_SECRET_KEY="0x4AAAAAA..."
```
*(Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions by Supabase).*

#### Step 6: Configure Frontend (`assets/js/config.js`)
Edit `assets/js/config.js` and set:
```javascript
window.AMBIKA_CONFIG = {
  SUPABASE_URL: 'https://<your-project-id>.supabase.co',
  SUPABASE_ANON_KEY: '<your-supabase-anon-public-key>',
  TURNSTILE_SITE_KEY: '<optional-cloudflare-turnstile-site-key>',
  ...
};
```
*(Note: Only the **public anon key** is placed in `config.js`. The **service_role key** must NEVER be placed in client-side code).*

---

### 🛡️ Child Safety & Data Retention Policy

- **Parent/Guardian Consent**: Explicit consent is required before submitting any student photography or identifiable student records.
- **Access Control**: Only authorized school faculty assigned the `admin` role in `admin_users` can view submitted files.
- **Public Concealment**: No submitted student photos or documents are ever published to the public website without separate administrative review and parental clearance.
- **Data Deletion / Correction**: Parents or guardians can request modification or complete deletion of submitted records by contacting `privacy.ambikaschool@gmail.com`.

---

## 📱 Browser & Device Support

- **Desktop:** Chrome, Edge, Safari, Firefox, Opera (Full HD, 2K, 4K).
- **Tablet:** iPad, Galaxy Tab, Surface (Portrait & Landscape).
- **Mobile:** Android & iOS (All screen sizes from 360px up to 480px+).
- **Accessibility:** Respects `prefers-reduced-motion`, semantic landmarks, high contrast text ratios, and screen-reader accessible alt attributes.

---

## 📄 License & Attribution

Designed and architected for **Ambika High School Tonki**, Madhya Pradesh, India.  
All code is open and customizable for institutional education use.
