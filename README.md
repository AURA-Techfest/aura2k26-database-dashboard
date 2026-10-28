# AURA 2K26 — Hardware & IoT Innovations Database Dashboard

A high-performance, fully static, responsive web dashboard built with vanilla **HTML5**, **CSS3**, and **JavaScript** to explore and review all 64 registered teams from the AURA 2K26 Hardware & IoT Exhibition.

---

## 🎨 Design & Aesthetics
- **Primary Typography**: **SEASONS** (`'The Seasons', 'Seasons'`, with editorial serif fallbacks: `'Playfair Display', 'Cinzel'`).
- **Secondary Typography**: **Proxima Nova** (`'Proxima Nova'`, with modern geometric grotesk fallbacks: `'Montserrat', -apple-system, sans-serif`).
- **Color Theme**:
  - Primary Accent: `#6f2138` (Deep Burgundy / Wine)
  - Secondary Tone: `#737373` (Refined Slate Gray)
  - Neutral Backgrounds: `#fbf9fa` / `#ffffff`
- **Animations & WebKit Features (Built From Scratch)**:
  - Custom WebKit scrollbars (`::-webkit-scrollbar` with `#6f2138` hover thumb).
  - WebKit backdrop blur (`-webkit-backdrop-filter: blur(12px)`) for sticky navigation and lightbox backdrop.
  - Multi-line text clamping (`-webkit-line-clamp`) for clean sidebar cards.
  - Custom keyframe animations:
    - `@keyframes cardFadeInUp` — Staggered entrance animation for form cards.
    - `@keyframes pulseDot` — Living pulse indicator for fully functional prototypes.
    - `@keyframes modalZoomIn` — Smooth lightbox zoom for member ID cards.

---

## 📁 Project Structure

```
aura2k26-database-dashboard/
├── index.html                   # Main static entry point
├── styles.css                   # Custom CSS with SEASONS & Proxima Nova theme
├── app.js                       # Vanilla JS application logic & interactive viewers
├── vercel.json                  # Vercel deployment configuration
├── assets/
│   ├── teams.json               # Master catalog of all 64 teams with metadata
│   ├── teams_data.js            # Offline-resilient dataset fallback for file:// protocol
│   └── Teams/                   # 64 individual team folders
│       ├── <TeamName>/
│       │   ├── data.json        # Clean JSON with full form details
│       │   ├── 1.jpg            # Team Leader ID Card
│       │   ├── 2.jpg            # Member 1 ID Card
│       │   ├── 3.jpg            # Member 2 ID Card (if applicable)
│       │   ├── 4.jpg            # Member 3 ID Card (if applicable)
│       │   ├── Abstract.pdf     # Downloaded Project Abstract (PDF)
│       │   └── Abstract.docx    # Downloaded Project Abstract (DOCX, where applicable)
└── scripts/
    └── organize_and_download.py # Asset organizer and Cloudinary downloader
```

---

## 🚀 Key Features

1. **Sidebar Navigation & Instant Filtering**:
   - Live search across Team Name, Project Title, Leader Name, Categories, and Registration IDs.
   - Quick filter chips: *All (64)*, *Fully Working*, *Minor Limitations*, *AI-Enabled*, *IoT-Connected*, *All Aliah*, *Mixed*, *Other Institutions*.
   - Multi-mode sorting: Registration ID order (#1 to #64), Team Name (A-Z, Z-A), Estimated Cost.
   - Keyboard navigation (`ArrowLeft` / `ArrowRight` to step through teams, `/` to jump to search, `ESC` to close modals).

2. **Filled Form Article View (Read In One Go)**:
   - **Hero Section**: Team name in Seasons font, Project Title, Status badge with live pulse indicator, Quick stats (Affiliation, Cost, Power, AI/IoT).
   - **Team Roster & ID Cards**: Leader contacts (with one-click `tel:` and `mailto:` links), full team member table, and high-resolution ID card grid.
   - **Interactive Lightbox**: Click any ID card (`1.jpg`, `2.jpg`, `3.jpg`, `4.jpg`) to zoom in, inspect, or download.
   - **Integrated Document Viewer (Window for PDF/DOCX)**:
     - Embedded directly into the page.
     - For **PDF**: Seamless embedded `<iframe src="...">` reader with fullscreen toggle and open in new tab.
     - For **DOCX**: Clean in-browser typography reader displaying the extracted write-up text directly on the page, with a 1-click download button for the original `.docx`.
   - **Problem, Solution & Innovation**: Full problem statement, hardware solution, and uniqueness.
   - **Working Principle & Components**: Step-by-step working principle, component badges, and real-world impact.
   - **AURA Demo Highlights**: Commercial potential, why the project is worth seeing, and exhibition history.
   - **Safety Audit & Compliance**: Hazards detected, built-in safety precautions, and supervision requirements.

3. **100% Static & Deployment Ready**:
   - Zero build steps or backend servers needed.
   - Deploy directly to **Vercel**, **GitHub Pages**, or **Netlify**.
   - Run locally using any Node server (e.g. `npx serve .`).

---

## 💻 Running Locally

### Option 1: Using Node.js (Recommended)
```bash
# Serve statically with npx serve
npx serve .

# Or using http-server
npx http-server . -p 3000
```
Open `http://localhost:3000` in any web browser.

### Option 2: Deploy to Vercel
Simply push this repository to GitHub and import it on Vercel:
```bash
# Or using Vercel CLI
npx vercel
```
Vercel will automatically detect `index.html` and serve the dashboard instantly.
