/**
 * AURA 2K26 — Hardware & IoT Database Dashboard
 * Pure Vanilla JavaScript (Static, Offline-Ready)
 */

(function () {
  'use strict';

  // --- App State ---
  let allTeams = [];
  let filteredTeams = [];
  let currentTeam = null;
  let activeFilter = 'all';
  let searchQuery = '';
  let sortMode = 'id_asc';

  // --- DOM Elements ---
  const teamNavList = document.getElementById('teamNavList');
  const teamArticle = document.getElementById('teamArticle');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const filterChips = document.querySelectorAll('.filter-chip');
  const sortSelect = document.getElementById('sortSelect');
  const teamsFilteredBadge = document.getElementById('teamsFilteredBadge');
  const totalTeamsCount = document.getElementById('totalTeamsCount');
  const workingTeamsCount = document.getElementById('workingTeamsCount');
  const aiCount = document.getElementById('aiCount');
  const iotCount = document.getElementById('iotCount');
  const crumbCurrent = document.getElementById('crumbCurrent');
  const prevTeamBtn = document.getElementById('prevTeamBtn');
  const nextTeamBtn = document.getElementById('nextTeamBtn');
  const navCounter = document.getElementById('navCounter');
  const printBtn = document.getElementById('printBtn');
  const downloadTeamJsonBtn = document.getElementById('downloadTeamJsonBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const appSidebar = document.getElementById('appSidebar');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  // Lightbox Elements
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxBackdrop = document.getElementById('lightboxBackdrop');
  const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');

  // --- Initializer ---
  async function init() {
    setupTheme();
    setupEventListeners();
    await loadData();
    computeSummaryStats();
    applyFilterAndSort();

    // Handle deep-linking via URL hash (e.g. #team=Proto-Electra)
    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);
  }

  // --- Data Loading ---
  async function loadData() {
    try {
      if (window.AURA_TEAMS_DATA && Array.isArray(window.AURA_TEAMS_DATA)) {
        allTeams = window.AURA_TEAMS_DATA;
      } else {
        const resp = await fetch('assets/teams.json');
        if (!resp.ok) throw new Error('Failed to load teams.json');
        allTeams = await resp.json();
      }
    } catch (err) {
      console.warn('Fallback loading error, attempting direct fetch:', err);
      try {
        const resp = await fetch('assets/teams.json');
        allTeams = await resp.json();
      } catch (err2) {
        console.error('Fatal: Could not load teams data', err2);
        teamArticle.innerHTML = `
          <div class="empty-state">
            <h2 style="color:var(--primary-color)">Could not load teams dataset.</h2>
            <p>Please ensure assets/teams.json or assets/teams_data.js exists.</p>
          </div>
        `;
        return;
      }
    }

    // Sort initially by index (1 to 64)
    allTeams.sort((a, b) => (a.index || 0) - (b.index || 0));
  }

  // --- Compute Summary Statistics for Header ---
  function computeSummaryStats() {
    if (!allTeams.length) return;
    const total = allTeams.length;
    const working = allTeams.filter(t => t.hasWorkingPrototype === 'fully_working').length;
    const ai = allTeams.filter(t => t.useAi === true).length;
    const iot = allTeams.filter(t => t.useIot === true).length;

    totalTeamsCount.textContent = total;
    workingTeamsCount.textContent = working;
    aiCount.textContent = ai;
    iotCount.textContent = iot;
  }

  // --- Filter and Sort Engine ---
  function applyFilterAndSort() {
    const q = searchQuery.trim().toLowerCase();

    filteredTeams = allTeams.filter(team => {
      // Filter Category
      if (activeFilter === 'fully_working' && team.hasWorkingPrototype !== 'fully_working') return false;
      if (activeFilter === 'minor_limitations' && team.hasWorkingPrototype !== 'minor_limitations') return false;
      if (activeFilter === 'ai' && !team.useAi) return false;
      if (activeFilter === 'iot' && !team.useIot) return false;
      if (activeFilter === 'all_aliah' && team.teamAffiliation !== 'all_aliah') return false;
      if (activeFilter === 'mixed' && team.teamAffiliation !== 'mixed') return false;
      if (activeFilter === 'all_other' && team.teamAffiliation !== 'all_other') return false;

      // Search Query Filter
      if (q) {
        const tName = (team.rawTeamName || '').toLowerCase();
        const pTitle = (team.projectTitle || '').toLowerCase();
        const lName = (team.teamLeaderName || '').toLowerCase();
        const regId = (team.registrationId || '').toLowerCase();
        const cat = (team.hardwareProjectCategories || []).join(' ').toLowerCase();
        const mDetails = (team.teamMemberDetails || '').toLowerCase();

        const match = tName.includes(q) ||
                      pTitle.includes(q) ||
                      lName.includes(q) ||
                      regId.includes(q) ||
                      cat.includes(q) ||
                      mDetails.includes(q);
        if (!match) return false;
      }

      return true;
    });

    // Apply Sorting
    filteredTeams.sort((a, b) => {
      switch (sortMode) {
        case 'name_asc':
          return (a.rawTeamName || '').localeCompare(b.rawTeamName || '');
        case 'name_desc':
          return (b.rawTeamName || '').localeCompare(a.rawTeamName || '');
        case 'cost_asc':
          return (a.prototypeDevelopmentCost || 0) - (b.prototypeDevelopmentCost || 0);
        case 'cost_desc':
          return (b.prototypeDevelopmentCost || 0) - (a.prototypeDevelopmentCost || 0);
        case 'id_asc':
        default:
          return (a.index || 0) - (b.index || 0);
      }
    });

    teamsFilteredBadge.textContent = `${filteredTeams.length} Teams`;
    renderSidebarList();

    // If currentTeam is not in filtered list or no current team, pick the first
    if (filteredTeams.length > 0) {
      if (!currentTeam || !filteredTeams.some(t => t.folderName === currentTeam.folderName)) {
        selectTeam(filteredTeams[0], false);
      } else {
        updateNavControls();
      }
    } else {
      currentTeam = null;
      renderEmptySearch();
    }
  }

  // --- Render Sidebar List ---
  function renderSidebarList() {
    teamNavList.innerHTML = '';
    if (filteredTeams.length === 0) {
      teamNavList.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--secondary-color); font-size: 0.85rem;">
          No matching teams found.
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    filteredTeams.forEach((team) => {
      const item = document.createElement('button');
      item.className = 'team-nav-item';
      item.setAttribute('role', 'tab');
      item.setAttribute('aria-selected', currentTeam && currentTeam.folderName === team.folderName ? 'true' : 'false');
      item.dataset.folder = team.folderName;

      if (currentTeam && currentTeam.folderName === team.folderName) {
        item.classList.add('active');
      }

      const statusClass = team.hasWorkingPrototype || 'no_prototype';
      const catFirst = (team.hardwareProjectCategories && team.hardwareProjectCategories[0]) || 'Hardware';
      const costFormatted = team.prototypeDevelopmentCost ? `₹${team.prototypeDevelopmentCost.toLocaleString()}` : '';

      item.innerHTML = `
        <div class="team-item-top">
          <div class="team-index-reg">
            <span class="team-index-tag">#${team.index}</span>
            <span class="team-reg-tag">${escapeHtml(team.registrationId || '')}</span>
          </div>
          <span class="team-status-dot ${statusClass}" title="${formatStatus(team.hasWorkingPrototype)}"></span>
        </div>
        <div class="team-item-name">${escapeHtml(team.rawTeamName)}</div>
        <div class="team-item-title">${escapeHtml(team.projectTitle || 'Untitled Project')}</div>
        <div class="team-item-meta">
          <span class="meta-pill">${escapeHtml(catFirst)}</span>
          ${team.teamSize ? `<span class="meta-pill">${team.teamSize} Members</span>` : ''}
          ${costFormatted ? `<span class="meta-pill">${costFormatted}</span>` : ''}
        </div>
      `;

      item.addEventListener('click', () => {
        selectTeam(team, true);
        if (window.innerWidth <= 960) {
          appSidebar.classList.remove('open');
        }
      });

      fragment.appendChild(item);
    });

    teamNavList.appendChild(fragment);
  }

  // --- Select Team and Render ---
  function selectTeam(team, updateHash = true) {
    if (!team) return;
    currentTeam = team;

    // Update active class in sidebar
    document.querySelectorAll('.team-nav-item').forEach(el => {
      if (el.dataset.folder === team.folderName) {
        el.classList.add('active');
        el.setAttribute('aria-selected', 'true');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        el.classList.remove('active');
        el.setAttribute('aria-selected', 'false');
      }
    });

    // Update URL hash
    if (updateHash) {
      window.location.hash = `team=${encodeURIComponent(team.folderName)}`;
    }

    crumbCurrent.textContent = team.rawTeamName;
    downloadTeamJsonBtn.href = `${team.folderRelPath}/data.json`;
    downloadTeamJsonBtn.setAttribute('download', `${team.folderName}_data.json`);

    updateNavControls();
    renderTeamDetails(team);

    // Scroll main section to top smoothly
    document.getElementById('appMain').scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Update Next / Previous buttons & Counter ---
  function updateNavControls() {
    if (!currentTeam || filteredTeams.length === 0) {
      prevTeamBtn.disabled = true;
      nextTeamBtn.disabled = true;
      navCounter.textContent = '0 / 0';
      return;
    }

    const currIdx = filteredTeams.findIndex(t => t.folderName === currentTeam.folderName);
    navCounter.textContent = `${currIdx + 1} / ${filteredTeams.length}`;

    prevTeamBtn.disabled = currIdx <= 0;
    nextTeamBtn.disabled = currIdx >= filteredTeams.length - 1;
  }

  // --- Deep-linking Hash Support ---
  function handleHashNavigation() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#team=')) {
      const folder = decodeURIComponent(hash.replace('#team=', ''));
      const found = allTeams.find(t => t.folderName === folder);
      if (found) {
        selectTeam(found, false);
      }
    }
  }

  // --- Render Team Details (The Filled Form) ---
  function renderTeamDetails(team) {
    const statusClass = team.hasWorkingPrototype || 'no_prototype';
    const statusLabel = formatStatus(team.hasWorkingPrototype);
    const costDisplay = team.prototypeDevelopmentCost ? `₹${Number(team.prototypeDevelopmentCost).toLocaleString('en-IN')}` : 'Not Specified';
    const affiliationDisplay = formatAffiliation(team.teamAffiliation, team.aliahMembers, team.otherInstitutionMembers);

    // Categories badges
    const categoriesHtml = (team.hardwareProjectCategories || []).map(cat => 
      `<span class="category-tag">${escapeHtml(cat)}</span>`
    ).join('');

    // Beneficiaries
    const beneficiariesHtml = (team.intendedBeneficiaries || []).map(b =>
      `<span class="beneficiary-pill">${escapeHtml(b)}</span>`
    ).join('') || '<span class="text-muted">Not specified</span>';

    // Hardware Components
    const componentsHtml = (team.majorHardwareComponents || []).map(c =>
      `<span class="component-pill">${escapeHtml(c)}</span>`
    ).join('') || '<span class="text-muted">None specified</span>';

    // Safety Hazards
    const hazards = team.safetyHazards || [];
    let hazardsHtml = '';
    if (hazards.length === 0 || (hazards.length === 1 && hazards[0] === 'none')) {
      hazardsHtml = `<span class="hazard-badge none">✓ No High Hazards Declared</span>`;
    } else {
      hazardsHtml = hazards.map(h => `<span class="hazard-badge">⚠️ ${escapeHtml(formatHazard(h))}</span>`).join('');
    }

    // ID Cards
    const idCardsHtml = renderIdCardsSection(team);

    // Integrated Document Viewer Window (PDF / DOCX)
    const docViewerHtml = renderDocumentViewerSection(team);

    teamArticle.innerHTML = `
      <!-- Hero Card -->
      <section class="hero-card animate-entrance">
        <div class="hero-header-row">
          <div class="hero-title-group">
            <span class="hero-index-pill">TEAM #${team.index} · ${escapeHtml(team.registrationId || '')}</span>
            <h1 class="hero-team-name">${escapeHtml(team.rawTeamName)}</h1>
            <div class="hero-project-title">${escapeHtml(team.projectTitle || 'Project Title Not Provided')}</div>
            <div class="hero-badges-strip">
              <span class="status-badge ${statusClass}">
                <span class="pulse-dot"></span>
                ${escapeHtml(statusLabel)}
              </span>
              ${categoriesHtml}
            </div>
          </div>
        </div>

        <div class="hero-metrics-grid">
          <div class="metric-item">
            <span class="metric-label">Team Leader</span>
            <span class="metric-value">${escapeHtml(team.teamLeaderName || 'N/A')}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Team Composition</span>
            <span class="metric-value">${escapeHtml(affiliationDisplay)}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Prototype Type</span>
            <span class="metric-value">${escapeHtml(team.prototypeType || 'Standalone Hardware')}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Estimated Budget</span>
            <span class="metric-value highlight">${costDisplay}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Power Source</span>
            <span class="metric-value" style="text-transform: capitalize;">${escapeHtml(team.powerSource || 'Battery')}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">AI / IoT Integration</span>
            <span class="metric-value">${team.useAi ? '🤖 AI Enabled' : 'No AI'} · ${team.useIot ? '📡 IoT Connected' : 'No IoT'}</span>
          </div>
        </div>
      </section>

      <!-- Section 1: Team Members & ID Cards -->
      <section class="content-card animate-entrance" style="animation-delay: 0.05s;">
        <div class="card-title-bar">
          <h2 class="card-heading">
            <svg class="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Team Roster & ID Verification
          </h2>
          <span class="card-badge">${team.teamSize || 1} Members</span>
        </div>

        <div class="team-contact-strip">
          <div class="contact-block">
            <span class="contact-label">Team Leader Contact</span>
            <span class="contact-val">${escapeHtml(team.teamLeaderName || 'N/A')}</span>
          </div>
          <div class="contact-block">
            <span class="contact-label">Leader Phone</span>
            <span class="contact-val">
              ${team.teamLeaderPhone ? `<a href="tel:${escapeHtml(team.teamLeaderPhone)}">📞 ${escapeHtml(team.teamLeaderPhone)}</a>` : 'N/A'}
            </span>
          </div>
          <div class="contact-block">
            <span class="contact-label">Leader Email</span>
            <span class="contact-val">
              ${team.teamLeaderEmail ? `<a href="mailto:${escapeHtml(team.teamLeaderEmail)}">✉️ ${escapeHtml(team.teamLeaderEmail)}</a>` : 'N/A'}
            </span>
          </div>
        </div>

        <div class="contact-label" style="margin-bottom: 6px;">Submitted Team Member Details</div>
        <div class="member-details-text">${escapeHtml(team.teamMemberDetails || 'No additional member details provided.')}</div>

        <div class="contact-label" style="margin-bottom: 10px;">Member ID Cards (Click to Inspect / Zoom)</div>
        <div class="id-cards-grid">
          ${idCardsHtml}
        </div>
      </section>

      <!-- Section 2: Integrated Document Viewer Window (Abstract PDF / DOCX) -->
      <section class="content-card document-viewer-card animate-entrance" style="animation-delay: 0.1s;">
        <div class="card-title-bar">
          <h2 class="card-heading">
            <svg class="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Project Abstract & Document Viewer
          </h2>
          <span class="card-badge">Integrated Reader</span>
        </div>

        ${docViewerHtml}
      </section>

      <!-- Section 3: Problem, Solution & Innovation -->
      <section class="content-card animate-entrance" style="animation-delay: 0.15s;">
        <div class="card-title-bar">
          <h2 class="card-heading">
            <svg class="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            Problem Statement & Innovation
          </h2>
          <span class="card-badge">Concept Core</span>
        </div>

        <div class="statement-box">
          <div class="statement-title">📌 Real-Life Problem Statement</div>
          <div class="statement-text">${escapeHtml(team.problemStatement || 'Not provided')}</div>
        </div>

        <div class="statement-box">
          <div class="statement-title">💡 Proposed Hardware Solution</div>
          <div class="statement-text highlight">${escapeHtml(team.solutionDescription || team.problemStatement || 'Not provided')}</div>
        </div>

        <div class="statement-box">
          <div class="statement-title">✨ Key Innovation & Uniqueness</div>
          <div class="statement-text">${escapeHtml(team.innovationDescription || team.solutionDescription || 'Not provided')}</div>
        </div>
      </section>

      <!-- Section 4: Technical Deep-Dive & Working Principle -->
      <section class="content-card animate-entrance" style="animation-delay: 0.2s;">
        <div class="card-title-bar">
          <h2 class="card-heading">
            <svg class="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            Working Principle & Hardware Architecture
          </h2>
          <span class="card-badge">${escapeHtml(team.currentWorkingStatus || 'Prototype')}</span>
        </div>

        <div class="statement-box">
          <div class="statement-title">⚙️ Working Principle & Technical Flow</div>
          <div class="statement-text">${escapeHtml(team.workingPrinciple || 'Not specified')}</div>
        </div>

        <div class="statement-box">
          <div class="statement-title">🔩 Major Hardware Components</div>
          <div class="components-pill-grid">
            ${componentsHtml}
          </div>
        </div>

        <div class="statement-box" style="margin-top: 18px;">
          <div class="statement-title">🎯 Intended Beneficiaries</div>
          <div class="beneficiaries-list">
            ${beneficiariesHtml}
          </div>
        </div>

        <div class="statement-box" style="margin-top: 18px;">
          <div class="statement-title">🌍 Potential Real-World Impact</div>
          <div class="statement-text">${escapeHtml(team.potentialImpact || 'Not specified')}</div>
        </div>
      </section>

      <!-- Section 5: Exhibition Value & Highlight -->
      <section class="content-card animate-entrance" style="animation-delay: 0.25s;">
        <div class="card-title-bar">
          <h2 class="card-heading">
            <svg class="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            AURA 2K26 Demonstration Highlights
          </h2>
          <span class="card-badge">Exhibition Focus</span>
        </div>

        <div class="statement-box">
          <div class="statement-title">🌟 Why This Project Is Worth Seeing</div>
          <div class="statement-text highlight">${escapeHtml(team.auraDemoHighlight || 'Demonstration details not provided.')}</div>
        </div>

        <div class="compliance-grid" style="margin-top: 16px;">
          <div class="compliance-item">
            <span class="compliance-label">Product / Commercial Potential</span>
            <span class="compliance-val" style="text-transform: capitalize;">${escapeHtml(team.productPotential || 'Yes')}</span>
          </div>
          <div class="compliance-item">
            <span class="compliance-label">Developed Entirely By Team</span>
            <span class="compliance-val" style="text-transform: capitalize;">${escapeHtml(team.prototypeDevelopedByTeam || 'Yes')}</span>
          </div>
          <div class="compliance-item">
            <span class="compliance-label">Previously Exhibited</span>
            <span class="compliance-val">${team.previouslyExhibited ? 'Yes' : 'No (First Showcase)'}</span>
          </div>
          ${team.previouslyExhibited && team.previousExhibitionDetails ? `
          <div class="compliance-item" style="grid-column: 1 / -1;">
            <span class="compliance-label">Previous Exhibition Details</span>
            <span class="compliance-val">${escapeHtml(team.previousExhibitionDetails)}</span>
          </div>` : ''}
        </div>
      </section>

      <!-- Section 6: Safety, Precautions & Rules -->
      <section class="content-card animate-entrance" style="animation-delay: 0.3s;">
        <div class="card-title-bar">
          <h2 class="card-heading">
            <svg class="card-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Safety Precautions & Operational Compliance
          </h2>
          <span class="card-badge">Safety Audit</span>
        </div>

        <div class="statement-box">
          <div class="statement-title">⚠️ Identified Safety Hazards</div>
          <div class="hazards-pill-container">
            ${hazardsHtml}
          </div>
        </div>

        <div class="statement-box" style="margin-top: 16px;">
          <div class="statement-title">🛡️ Built-In Safety Precautions</div>
          <div class="statement-text">${escapeHtml(team.safetyPrecautions || 'Standard safety precautions followed.')}</div>
        </div>

        <div class="compliance-grid" style="margin-top: 18px;">
          <div class="compliance-item">
            <span class="compliance-label">Requires Continuous Supervision</span>
            <span class="compliance-val">${team.requiresContinuousSupervision ? '⚠️ Yes (Strict Monitoring Required)' : '✓ No (Safe for Autonomous Display)'}</span>
          </div>
          <div class="compliance-item">
            <span class="compliance-label">Registration Status</span>
            <span class="compliance-val" style="color:var(--status-working-text);">✓ Confirmed & Verified</span>
          </div>
          <div class="compliance-item">
            <span class="compliance-label">Registration ID</span>
            <span class="compliance-val" style="font-family: monospace;">${escapeHtml(team.registrationId || 'N/A')}</span>
          </div>
          <div class="compliance-item">
            <span class="compliance-label">Submission Date</span>
            <span class="compliance-val">${formatDate(team.createdAt)}</span>
          </div>
        </div>
      </section>
    `;

    // Attach click events for ID card images
    attachIdCardListeners();

    // Attach expand toggle for Document Viewer
    attachDocViewerListeners();
  }

  // --- Render ID Cards Grid ---
  function renderIdCardsSection(team) {
    const roles = ['Team Leader', 'Member 1', 'Member 2', 'Member 3'];
    const cards = team.idCards || [];

    return cards.map((card, idx) => {
      const roleName = roles[idx] || `Member ${idx + 1}`;
      const imgPath = card.relPath || `assets/Teams/${team.folderName}/${card.filename}`;
      const exists = card.exists !== false;

      if (!exists) {
        return `
          <div class="id-card-tile">
            <div class="id-card-thumb-wrap">
              <div class="id-card-missing-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>ID Card Missing or to be added manually</span>
              </div>
            </div>
            <div class="id-card-caption">
              <span class="id-slot-tag">${roleName}</span>
              <span class="id-file-name">${card.filename}</span>
            </div>
          </div>
        `;
      }

      return `
        <div class="id-card-tile">
          <div class="id-card-thumb-wrap" data-img-src="${imgPath}" data-title="${escapeHtml(team.rawTeamName)} — ${roleName} ID">
            <img class="id-card-img" src="${imgPath}" alt="${roleName} ID Card" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'id-card-missing-placeholder\\'>Image not loaded</div>'">
            <div class="id-card-zoom-overlay">
              <span class="id-card-zoom-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                View ID
              </span>
            </div>
          </div>
          <div class="id-card-caption">
            <span class="id-slot-tag">${roleName}</span>
            <span class="id-file-name">${card.filename}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Render Document Viewer Section (Window for PDF/DOCX) ---
  function renderDocumentViewerSection(team) {
    const abstract = team.abstract || {};
    const filename = abstract.filename || 'Abstract.pdf';
    const isDocx = abstract.isDocx === true || filename.endsWith('.docx');
    const docPath = abstract.relPath || `assets/Teams/${team.folderName}/${filename}`;
    const badgeType = isDocx ? 'docx' : 'pdf';
    const originalName = abstract.originalName || filename;

    let viewerContent = '';

    if (isDocx) {
      // DOCX Rendered Canvas
      const textContent = abstract.extractedText || 'DOCX text extraction not available. Use the download button below to view the original file.';
      viewerContent = `
        <div class="docx-rendered-view">
          <div class="docx-header-banner">
            <div>
              <strong>Word Document (.docx)</strong> — Native Text Extracted
            </div>
            <a href="${docPath}" class="viewer-btn" download="${filename}">
              📥 Download Original .docx
            </a>
          </div>
          <div class="docx-body-text">
            ${escapeHtml(textContent).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
          </div>
        </div>
      `;
    } else {
      // PDF Embedded Viewer
      viewerContent = `
        <iframe class="pdf-iframe" src="${docPath}" title="Team Abstract PDF">
          <p>Your browser does not support inline PDFs. <a href="${docPath}" target="_blank">Click here to view or download the PDF</a>.</p>
        </iframe>
      `;
    }

    return `
      <div class="viewer-toolbar">
        <div class="doc-info">
          <span class="doc-badge ${badgeType}">${badgeType.toUpperCase()}</span>
          <span class="doc-name" title="${escapeHtml(originalName)}">${escapeHtml(originalName)}</span>
        </div>
        <div class="viewer-actions">
          <a href="${docPath}" target="_blank" class="viewer-btn" title="Open in new browser tab">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            <span>Open Tab</span>
          </a>
          <a href="${docPath}" download="${filename}" class="viewer-btn" title="Save file to device">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download</span>
          </a>
          <button id="toggleExpandDocBtn" class="viewer-btn" title="Expand / Shrink window height">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
            <span id="expandBtnLabel">Expand</span>
          </button>
        </div>
      </div>
      <div class="document-window" id="documentWindow">
        ${viewerContent}
      </div>
    `;
  }

  // --- Attach ID Card Lightbox Listeners ---
  function attachIdCardListeners() {
    document.querySelectorAll('.id-card-thumb-wrap[data-img-src]').forEach(tile => {
      tile.addEventListener('click', () => {
        const src = tile.dataset.imgSrc;
        const title = tile.dataset.title;
        openLightbox(src, title);
      });
    });
  }

  // --- Attach Document Viewer Listeners ---
  function attachDocViewerListeners() {
    const expandBtn = document.getElementById('toggleExpandDocBtn');
    const docWindow = document.getElementById('documentWindow');
    const expandBtnLabel = document.getElementById('expandBtnLabel');

    if (expandBtn && docWindow) {
      expandBtn.addEventListener('click', () => {
        docWindow.classList.toggle('expanded');
        const isExp = docWindow.classList.contains('expanded');
        expandBtnLabel.textContent = isExp ? 'Collapse' : 'Expand';
      });
    }
  }

  // --- Lightbox Operations ---
  function openLightbox(src, title) {
    lightboxImg.src = src;
    lightboxTitle.textContent = title || 'Member ID Card';
    lightboxDownloadBtn.href = src;
    lightboxDownloadBtn.setAttribute('download', (title || 'id_card').replace(/[^a-zA-Z0-9_-]/g, '_') + '.jpg');
    lightboxModal.classList.add('active');
    lightboxModal.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    lightboxModal.classList.remove('active');
    lightboxModal.setAttribute('aria-hidden', 'true');
    lightboxImg.src = '';
  }

  // --- Render Empty Search ---
  function renderEmptySearch() {
    teamArticle.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h2 style="font-family: var(--font-primary); font-size: 1.4rem;">No teams match your search or filter.</h2>
        <p>Try clearing filters or searching with different keywords.</p>
        <button id="resetSearchBtn" class="viewer-btn" style="margin-top: 10px; padding: 8px 16px;">Reset Search & Filters</button>
      </div>
    `;

    const resetBtn = document.getElementById('resetSearchBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        activeFilter = 'all';
        filterChips.forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
        applyFilterAndSort();
      });
    }
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Search Input
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = e.target.value;
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        applyFilterAndSort();
      }, 150);
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      applyFilterAndSort();
      searchInput.focus();
    });

    // Filter Chips
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.dataset.filter;
        applyFilterAndSort();
      });
    });

    // Sort Select
    sortSelect.addEventListener('change', (e) => {
      sortMode = e.target.value;
      applyFilterAndSort();
    });

    // Next / Previous Navigation
    prevTeamBtn.addEventListener('click', () => {
      navigateStep(-1);
    });

    nextTeamBtn.addEventListener('click', () => {
      navigateStep(1);
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Ignore if user is currently typing in an input
      if (document.activeElement === searchInput) {
        if (e.key === 'Escape') {
          searchInput.blur();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateStep(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateStep(1);
      } else if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      } else if (e.key === 'Escape') {
        if (lightboxModal.classList.contains('active')) {
          closeLightbox();
        }
      }
    });

    // Print
    printBtn.addEventListener('click', () => {
      window.print();
    });

    // Lightbox Close
    lightboxCloseBtn.addEventListener('click', closeLightbox);
    lightboxBackdrop.addEventListener('click', closeLightbox);

    // Sidebar Toggle (Mobile)
    sidebarToggle.addEventListener('click', () => {
      appSidebar.classList.toggle('open');
    });

    // Theme Toggle
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('aura_theme', next);
    });
  }

  function navigateStep(delta) {
    if (!currentTeam || filteredTeams.length === 0) return;
    const currIdx = filteredTeams.findIndex(t => t.folderName === currentTeam.folderName);
    const nextIdx = currIdx + delta;
    if (nextIdx >= 0 && nextIdx < filteredTeams.length) {
      selectTeam(filteredTeams[nextIdx], true);
    }
  }

  function setupTheme() {
    const saved = localStorage.getItem('aura_theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  // --- Helper Formatters ---
  function formatStatus(status) {
    switch (status) {
      case 'fully_working': return 'Fully Working Prototype';
      case 'minor_limitations': return 'Minor Limitations / Calibration';
      case 'no_prototype': return 'Concept / No Prototype';
      default: return 'Functional Prototype';
    }
  }

  function formatAffiliation(affil, aliahCount, otherCount) {
    let base = 'Mixed';
    if (affil === 'all_aliah') base = 'All Aliah University';
    else if (affil === 'all_other') base = 'External Institution';
    
    if (aliahCount !== undefined && otherCount !== undefined) {
      return `${base} (${aliahCount} AU / ${otherCount} Ext)`;
    }
    return base;
  }

  function formatHazard(hazard) {
    return hazard
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatDate(isoStr) {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoStr;
    }
  }

  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Start the application
  document.addEventListener('DOMContentLoaded', init);

})();
