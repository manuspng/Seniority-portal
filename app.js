// Ayurvedic & Unani Medical Officers Seniority & Retirement Interactive Dashboard
// Pure Superannuation & Seniority Timeline Engine

(function () {
  'use strict';

  const TODAY = new Date();
  const CURRENT_CALENDAR_YEAR = TODAY.getFullYear(); // 2026

  // Application State
  const state = {
    retirementAge: 60,
    selectedPoleYear: CURRENT_CALENDAR_YEAR,
    activeTab: 'dashboard',
    
    // Table filter & pagination states
    tables: {
      working: { search: '', recruitment: 'ALL', sortCol: 'seniorityNo', sortDir: 'asc', page: 1, pageSize: 25 },
      retired: { search: '', recruitment: 'ALL', sortCol: 'seniorityNo', sortDir: 'asc', page: 1, pageSize: 25 },
      master:  { search: '', recruitment: 'ALL', sortCol: 'seniorityNo', sortDir: 'asc', page: 1, pageSize: 25 }
    },

    selectedOfficerNo: 246,
    currentObjectionOfficer: null,
    pendingUploadOfficers: null,
    theme: localStorage.getItem('ayush_theme') || 'light'
  };

  // Days in month helper
  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  // Exact Calculation matching Fundamental Rule 56:
  // Day = 01 -> EOMONTH(DOB + Age, -1), otherwise EOMONTH(DOB + Age, 0)
  function calculateRetirement(officer, retirementAge) {
    const day = officer.dobDay;
    const month = officer.dobMonth;
    const birthYear = officer.dobYear;

    let retYear = birthYear + retirementAge;
    let retMonth = month;

    if (day === 1) {
      if (month === 1) {
        retMonth = 12;
        retYear -= 1;
      } else {
        retMonth = month - 1;
      }
    }

    const retDay = getDaysInMonth(retYear, retMonth);
    const retDate = new Date(retYear, retMonth - 1, retDay);

    return {
      retDay,
      retMonth,
      retYear,
      retDate,
      dateString: `${String(retDay).padStart(2, '0')}/${String(retMonth).padStart(2, '0')}/${retYear}`
    };
  }

  // Fetch Raw Officers (Prioritize Custom Uploaded Officers from localStorage)
  function getRawOfficers() {
    const stored = localStorage.getItem('ayush_custom_officers');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing stored officers:', e);
      }
    }
    return window.OFFICERS_DATA || [];
  }

  // Process all officers with computed dates
  function processOfficers() {
    const raw = getRawOfficers();

    return raw.map(o => {
      const ret = calculateRetirement(o, state.retirementAge);
      const isCurrentlyWorking = ret.retDate >= TODAY;
      const isAlreadyRetired = ret.retDate < TODAY;

      const diffMs = ret.retDate.getTime() - TODAY.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffYears = (diffDays / 365.25).toFixed(1);

      return {
        ...o,
        retirement: ret,
        isCurrentlyWorking,
        isAlreadyRetired,
        remainingDays: diffDays,
        remainingYears: diffYears
      };
    });
  }

  // DOM Elements Cache
  const els = {
    retAgeInput: document.getElementById('retAgeInput'),
    activeRulePill: document.getElementById('activeRulePill'),
    
    // KPI Values
    kpiTotal: document.getElementById('kpiTotal'),
    kpiPastRetired: document.getElementById('kpiPastRetired'),
    kpiCurrentYear: document.getElementById('kpiCurrentYear'),
    kpiFutureRetiring: document.getElementById('kpiFutureRetiring'),
    kpiCurrentlyActive: document.getElementById('kpiCurrentlyActive'),

    // Current Year Constant Monitor Elements
    currentYearBadge: document.getElementById('currentYearBadge'),
    currentYearTotalCount: document.getElementById('currentYearTotalCount'),
    currentYearAlreadyRetiredCount: document.getElementById('currentYearAlreadyRetiredCount'),
    currentYearStillWorkingCount: document.getElementById('currentYearStillWorkingCount'),
    currentYearTableBody: document.getElementById('currentYearTableBody'),

    // Pole Graph
    poleChartContainer: document.getElementById('poleChartContainer'),

    // Dual Dynamic Year Lists
    selectedYearTitle: document.getElementById('selectedYearTitle'),
    selectedYearBadge: document.getElementById('selectedYearBadge'),
    selectedYearTableBody: document.getElementById('selectedYearTableBody'),
    
    nextYearTitle: document.getElementById('nextYearTitle'),
    nextYearBadge: document.getElementById('nextYearBadge'),
    nextYearTableBody: document.getElementById('nextYearTableBody'),

    // Tabs & Badges
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-content'),
    badgeWorkingCount: document.getElementById('badgeWorkingCount'),
    badgeRetiredCount: document.getElementById('badgeRetiredCount'),
    badgeMasterCount: document.getElementById('badgeMasterCount'),

    // Full Tables
    workingTableBody: document.getElementById('workingTableBody'),
    retiredTableBody: document.getElementById('retiredTableBody'),
    masterTableBody: document.getElementById('masterTableBody'),

    // Inspector
    inspectorOfficerList: document.getElementById('inspectorOfficerList'),
    inspectorSearch: document.getElementById('inspectorSearch'),
    dossierContainer: document.getElementById('dossierContainer'),

    // Modals
    disclaimerPopup: document.getElementById('disclaimerPopup'),
    rulesDialog: document.getElementById('rulesDialog'),
    officerDialog: document.getElementById('officerDialog'),
    officerModalContent: document.getElementById('officerModalContent'),
    
    // Objection Modal
    objectionDialog: document.getElementById('objectionDialog'),
    objectionOfficerSummary: document.getElementById('objectionOfficerSummary'),
    objectionSender: document.getElementById('objectionSender'),
    objectionField: document.getElementById('objectionField'),
    objectionCorrectVal: document.getElementById('objectionCorrectVal'),
    objectionRemarks: document.getElementById('objectionRemarks'),

    // Admin Modals & Elements
    adminBtn: document.getElementById('adminBtn'),
    adminAuthDialog: document.getElementById('adminAuthDialog'),
    adminPinInput: document.getElementById('adminPinInput'),
    adminPinError: document.getElementById('adminPinError'),
    adminPanelDialog: document.getElementById('adminPanelDialog'),
    adminObjectionCount: document.getElementById('adminObjectionCount'),
    adminObjectionsBody: document.getElementById('adminObjectionsBody'),
    fileDropZone: document.getElementById('fileDropZone'),
    sheetFileInput: document.getElementById('sheetFileInput'),
    uploadStatusMsg: document.getElementById('uploadStatusMsg'),
    uploadPreviewSection: document.getElementById('uploadPreviewSection'),
    uploadPreviewBody: document.getElementById('uploadPreviewBody'),
    previewCountBadge: document.getElementById('previewCountBadge')
  };

  // Set Theme
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ayush_theme', theme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? 'Light Theme' : 'Dark Theme';
    }
  }

  // Initialize Event Listeners
  function initControls() {
    if (els.retAgeInput) {
      els.retAgeInput.value = state.retirementAge;

      // Retirement Age Change
      els.retAgeInput.addEventListener('change', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 50) val = 60;
        if (val > 70) val = 70;
        state.retirementAge = val;
        e.target.value = val;
        render();
      });
    }

    // Preset Age Buttons
    document.querySelectorAll('[data-ret-age]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.retirementAge = parseInt(btn.dataset.retAge, 10);
        if (els.retAgeInput) els.retAgeInput.value = state.retirementAge;
        document.querySelectorAll('[data-ret-age]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
    });

    // Tab Switching
    els.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });

    // Theme Toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      });
    }

    // Rules Modal
    const rulesBtn = document.getElementById('rulesBtn');
    if (rulesBtn) {
      rulesBtn.addEventListener('click', () => {
        els.rulesDialog.showModal();
      });
    }

    // Admin Auth Button
    els.adminBtn?.addEventListener('click', () => {
      if (els.adminPinInput) els.adminPinInput.value = '';
      if (els.adminPinError) els.adminPinError.style.display = 'none';
      els.adminAuthDialog?.showModal();
    });

    // Admin Tabs Switching inside Admin Panel
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.adminTab;
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
        const contentEl = document.getElementById(targetTab);
        if (contentEl) contentEl.style.display = 'block';
        if (targetTab === 'objectionsTab') {
          renderAdminObjections();
        }
      });
    });

    // File Upload Drag & Drop
    if (els.fileDropZone && els.sheetFileInput) {
      els.fileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        els.fileDropZone.classList.add('dragover');
      });
      els.fileDropZone.addEventListener('dragleave', () => {
        els.fileDropZone.classList.remove('dragover');
      });
      els.fileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.fileDropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
      els.sheetFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFile(e.target.files[0]);
        }
      });
    }

    // Export Buttons
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => exportTableToCSV('master'));
    document.getElementById('exportWorkingCsvBtn')?.addEventListener('click', () => exportTableToCSV('working'));
    document.getElementById('exportRetiredCsvBtn')?.addEventListener('click', () => exportTableToCSV('retired'));
    document.getElementById('exportSelectedYearCsvBtn')?.addEventListener('click', () => exportYearToCSV(state.selectedPoleYear));
    document.getElementById('exportNextYearCsvBtn')?.addEventListener('click', () => exportYearToCSV(state.selectedPoleYear + 1));
    document.getElementById('printBtn')?.addEventListener('click', () => window.print());

    // Search and Filters for each table
    ['working', 'retired', 'master'].forEach(tblKey => {
      const searchEl = document.getElementById(`${tblKey}Search`);
      const recruitEl = document.getElementById(`${tblKey}RecruitFilter`);
      const pageSizeEl = document.getElementById(`${tblKey}PageSize`);

      searchEl?.addEventListener('input', (e) => {
        state.tables[tblKey].search = e.target.value.toLowerCase().trim();
        state.tables[tblKey].page = 1;
        renderTablesOnly();
      });

      recruitEl?.addEventListener('change', (e) => {
        state.tables[tblKey].recruitment = e.target.value;
        state.tables[tblKey].page = 1;
        renderTablesOnly();
      });

      pageSizeEl?.addEventListener('change', (e) => {
        state.tables[tblKey].pageSize = e.target.value === 'ALL' ? 9999 : parseInt(e.target.value, 10);
        state.tables[tblKey].page = 1;
        renderTablesOnly();
      });
    });

    // Table Header Sorting
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const tabPane = th.closest('.tab-content');
        if (!tabPane) return;
        const tblKey = tabPane.id.replace('Tab', '');
        if (!state.tables[tblKey]) return;

        const sortField = th.dataset.sort;
        const currentSort = state.tables[tblKey].sortCol;
        const currentDir = state.tables[tblKey].sortDir;

        if (currentSort === sortField) {
          state.tables[tblKey].sortDir = currentDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.tables[tblKey].sortCol = sortField;
          state.tables[tblKey].sortDir = 'asc';
        }
        renderTablesOnly();
      });
    });

    // Inspector Search
    els.inspectorSearch?.addEventListener('input', (e) => {
      renderInspectorList(e.target.value.toLowerCase().trim());
    });

    // Disclaimer Overlay backdrop click
    const disclaimerPopup = document.getElementById('disclaimerPopup');
    if (disclaimerPopup) {
      disclaimerPopup.addEventListener('click', (e) => {
        if (e.target === disclaimerPopup) {
          window.closeDisclaimerPopup();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.closeDisclaimerPopup();
      }
    });

    updateObjectionCountBadge();
  }

  function switchTab(tab) {
    state.activeTab = tab;
    els.tabBtns.forEach(b => {
      if (b.dataset.tab === tab) b.classList.add('active');
      else b.classList.remove('active');
    });

    els.tabPanels.forEach(p => {
      if (p.id === `${tab}Tab`) p.classList.add('active');
      else p.classList.remove('active');
    });

    if (tab === 'inspector') {
      renderInspector();
    }
  }

  // 1. Render Top KPI Cards (Gone, Current, Coming Years)
  function renderKPIs(officers) {
    const total = officers.length;
    
    const pastOfficers = officers.filter(o => o.retirement.retYear < CURRENT_CALENDAR_YEAR);
    const currentYearOfficers = officers.filter(o => o.retirement.retYear === CURRENT_CALENDAR_YEAR);
    const futureOfficers = officers.filter(o => o.retirement.retYear > CURRENT_CALENDAR_YEAR);
    const currentlyActive = officers.filter(o => o.isCurrentlyWorking);

    els.kpiTotal.textContent = total;
    els.kpiPastRetired.textContent = pastOfficers.length;
    els.kpiCurrentYear.textContent = currentYearOfficers.length;
    els.kpiFutureRetiring.textContent = futureOfficers.length;
    els.kpiCurrentlyActive.textContent = currentlyActive.length;

    // Rule pill
    if (els.activeRulePill) {
      els.activeRulePill.textContent = `Year: ${CURRENT_CALENDAR_YEAR} | Standard Age: ${state.retirementAge} Yrs | FR-56 Active`;
    }

    // Tab badges
    els.badgeWorkingCount.textContent = currentlyActive.length;
    els.badgeRetiredCount.textContent = total - currentlyActive.length;
    els.badgeMasterCount.textContent = total;
  }

  // 2. Render Constant Current Year Monitor (Whole Year Constant)
  function renderCurrentYearMonitor(officers) {
    const list2026 = officers.filter(o => o.retirement.retYear === CURRENT_CALENDAR_YEAR);
    list2026.sort((a, b) => a.retirement.retDate - b.retirement.retDate);

    const alreadyRetired = list2026.filter(o => o.isAlreadyRetired);
    const stillWorking = list2026.filter(o => o.isCurrentlyWorking);

    els.currentYearBadge.textContent = `${CURRENT_CALENDAR_YEAR}`;
    els.currentYearTotalCount.textContent = list2026.length;
    els.currentYearAlreadyRetiredCount.textContent = alreadyRetired.length;
    els.currentYearStillWorkingCount.textContent = stillWorking.length;

    if (list2026.length === 0) {
      els.currentYearTableBody.innerHTML = `
        <tr><td colspan="8" style="text-align:center; padding:1.5rem; color:var(--text-muted);">
          No retirements in this year.
        </td></tr>
      `;
      return;
    }

    els.currentYearTableBody.innerHTML = list2026.map(o => {
      if (o.isAlreadyRetired) {
        return `
          <tr class="retired-grey-row" onclick="window.viewOfficerModal(${o.seniorityNo})">
            <td class="seniority-cell">${o.seniorityNo}</td>
            <td class="officer-name-cell">
              <span>${o.name}</span>
              <span class="officer-father-sub">${o.fatherOrHusband}</span>
            </td>
            <td>${o.dob}</td>
            <td><strong>${o.retirement.dateString}</strong></td>
            <td>${o.qualification}</td>
            <td>${o.recruitmentType}</td>
            <td>
              <span class="status-badge badge-already-retired">
                Retired (${o.retirement.dateString})
              </span>
            </td>
            <td>
              <button class="btn-subtle" onclick="event.stopPropagation(); window.openObjectionModal(${o.seniorityNo});">
                Report
              </button>
            </td>
          </tr>
        `;
      } else {
        return `
          <tr class="working-dark-row" onclick="window.viewOfficerModal(${o.seniorityNo})">
            <td class="seniority-cell">${o.seniorityNo}</td>
            <td class="officer-name-cell">
              <span>${o.name}</span>
              <span class="officer-father-sub">${o.fatherOrHusband}</span>
            </td>
            <td>${o.dob}</td>
            <td><strong style="color:var(--primary-navy);">${o.retirement.dateString}</strong></td>
            <td>${o.qualification}</td>
            <td>${o.recruitmentType}</td>
            <td>
              <span class="status-badge badge-still-working">
                In Service (${o.remainingDays} days left)
              </span>
            </td>
            <td>
              <button class="btn-subtle" onclick="event.stopPropagation(); window.openObjectionModal(${o.seniorityNo});">
                Report
              </button>
            </td>
          </tr>
        `;
      }
    }).join('');
  }

  // 3. Render Dynamic Pole Graph (Bar Chart from 2019 to 2047+)
  function renderPoleGraph(officers) {
    const yearCounts = {};
    let minYear = 9999;
    let maxYear = 0;

    officers.forEach(o => {
      const yr = o.retirement.retYear;
      yearCounts[yr] = (yearCounts[yr] || 0) + 1;
      if (yr < minYear) minYear = yr;
      if (yr > maxYear) maxYear = yr;
    });

    if (minYear > 2019) minYear = 2019;
    if (maxYear < 2047) maxYear = 2047;

    const years = [];
    let maxCount = 1;
    for (let y = minYear; y <= maxYear; y++) {
      const count = yearCounts[y] || 0;
      if (count > maxCount) maxCount = count;
      years.push({ year: y, count });
    }

    const totalBars = years.length;
    const svgWidth = Math.max(880, totalBars * 32);
    const height = 260;
    const padLeft = 40;
    const padRight = 25;
    const padTop = 25;
    const padBottom = 40;

    const chartW = svgWidth - padLeft - padRight;
    const chartH = height - padTop - padBottom;
    const barW = Math.max(16, (chartW / totalBars) - 8);

    let polesSvg = '';
    years.forEach((item, i) => {
      const x = padLeft + (i * (chartW / totalBars)) + 4;
      const barH = item.count > 0 ? (item.count / maxCount) * chartH : 4;
      const y = padTop + chartH - barH;

      const isSelected = item.year === state.selectedPoleYear;
      const isCurrent = item.year === CURRENT_CALENDAR_YEAR;
      const isPast = item.year < CURRENT_CALENDAR_YEAR;

      let fillColor;
      if (isSelected) {
        fillColor = '#d97706';
      } else if (isCurrent) {
        fillColor = '#d97706';
      } else if (isPast) {
        fillColor = '#64748b';
      } else {
        fillColor = '#1e3a8a';
      }

      polesSvg += `
        <g class="pole-group" data-year="${item.year}">
          <rect class="pole-bar ${isSelected ? 'active-pole' : ''}"
                x="${x}" y="${y}" width="${barW}" height="${barH}"
                fill="${fillColor}" rx="3"
                data-year="${item.year}" data-count="${item.count}">
            <title>Year ${item.year}: ${item.count} Officers</title>
          </rect>
          ${item.count > 0 ? `<text x="${x + barW / 2}" y="${y - 5}" font-size="10" text-anchor="middle" font-weight="700" fill="${isSelected ? '#b45309' : '#334155'}">${item.count}</text>` : ''}
          <text x="${x + barW / 2}" y="${height - 18}" font-size="10" text-anchor="middle" font-weight="${isSelected || isCurrent ? '700' : '500'}" fill="${isSelected ? '#b45309' : (isCurrent ? '#d97706' : '#64748b')}">${item.year}</text>
          ${isCurrent ? `<text x="${x + barW / 2}" y="${height - 5}" font-size="8" text-anchor="middle" font-weight="700" fill="#d97706">Current</text>` : ''}
          ${isSelected && !isCurrent ? `<text x="${x + barW / 2}" y="${height - 5}" font-size="8" text-anchor="middle" font-weight="700" fill="#b45309">Selected</text>` : ''}
        </g>
      `;
    });

    els.poleChartContainer.innerHTML = `
      <svg class="pole-chart-svg" viewBox="0 0 ${svgWidth} ${height}" preserveAspectRatio="xMinYMin meet">
        <line x1="${padLeft}" y1="${padTop}" x2="${svgWidth - padRight}" y2="${padTop}" stroke="#e2e8f0" stroke-dasharray="3"/>
        <line x1="${padLeft}" y1="${padTop + chartH / 2}" x2="${svgWidth - padRight}" y2="${padTop + chartH / 2}" stroke="#e2e8f0" stroke-dasharray="3"/>
        <line x1="${padLeft}" y1="${padTop + chartH}" x2="${svgWidth - padRight}" y2="${padTop + chartH}" stroke="#cbd5e1" stroke-width="1.5"/>
        ${polesSvg}
      </svg>
    `;

    els.poleChartContainer.querySelectorAll('.pole-bar').forEach(bar => {
      bar.addEventListener('click', () => {
        const yr = parseInt(bar.dataset.year, 10);
        state.selectedPoleYear = yr;
        renderPoleGraph(officers);
        renderDualYearLists(officers);
      });
    });
  }

  // 4. Render Dual Dynamic Lists: Selected Year & Next Year
  function renderDualYearLists(officers) {
    const selYear = state.selectedPoleYear;
    const nextYear = selYear + 1;

    const selYearList = officers.filter(o => o.retirement.retYear === selYear);
    selYearList.sort((a, b) => a.retirement.retDate - b.retirement.retDate);

    const nextYearList = officers.filter(o => o.retirement.retYear === nextYear);
    nextYearList.sort((a, b) => a.retirement.retDate - b.retirement.retDate);

    els.selectedYearTitle.textContent = `Year ${selYear} Superannuation List`;
    els.selectedYearBadge.textContent = `${selYearList.length} Officers`;

    els.nextYearTitle.textContent = `Next Year ${nextYear} Superannuation List`;
    els.nextYearBadge.textContent = `${nextYearList.length} Officers`;

    // Populate Selected Year Table
    if (selYearList.length === 0) {
      els.selectedYearTableBody.innerHTML = `
        <tr><td colspan="7" style="text-align:center; padding:1.75rem; color:var(--text-muted);">
          No retirements in Year ${selYear}.
        </td></tr>
      `;
    } else {
      els.selectedYearTableBody.innerHTML = selYearList.map(o => {
        const isPast = o.isAlreadyRetired;
        return `
          <tr class="${isPast ? 'retired-grey-row' : 'working-dark-row'}" onclick="window.viewOfficerModal(${o.seniorityNo})">
            <td class="seniority-cell">${o.seniorityNo}</td>
            <td class="officer-name-cell">
              <span>${o.name}</span>
              <span class="officer-father-sub">${o.fatherOrHusband}</span>
            </td>
            <td>${o.dob}</td>
            <td><strong>${o.retirement.dateString}</strong></td>
            <td>${o.qualification}</td>
            <td>
              <span class="status-badge ${isPast ? 'badge-already-retired' : 'badge-still-working'}">
                ${isPast ? 'Retired' : 'In Service'}
              </span>
            </td>
            <td>
              <button class="btn-subtle" onclick="event.stopPropagation(); window.openObjectionModal(${o.seniorityNo});">
                Report
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Populate Next Year Table
    if (nextYearList.length === 0) {
      els.nextYearTableBody.innerHTML = `
        <tr><td colspan="7" style="text-align:center; padding:1.75rem; color:var(--text-muted);">
          No retirements in Year ${nextYear}.
        </td></tr>
      `;
    } else {
      els.nextYearTableBody.innerHTML = nextYearList.map(o => {
        const isPast = o.isAlreadyRetired;
        return `
          <tr class="${isPast ? 'retired-grey-row' : 'working-dark-row'}" onclick="window.viewOfficerModal(${o.seniorityNo})">
            <td class="seniority-cell">${o.seniorityNo}</td>
            <td class="officer-name-cell">
              <span>${o.name}</span>
              <span class="officer-father-sub">${o.fatherOrHusband}</span>
            </td>
            <td>${o.dob}</td>
            <td><strong>${o.retirement.dateString}</strong></td>
            <td>${o.qualification}</td>
            <td>
              <span class="status-badge ${isPast ? 'badge-already-retired' : 'badge-still-working'}">
                ${isPast ? 'Retired' : 'In Service'}
              </span>
            </td>
            <td>
              <button class="btn-subtle" onclick="event.stopPropagation(); window.openObjectionModal(${o.seniorityNo});">
                Report
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // 5. Table Data Filtering & Sorting Logic
  function getFilteredTableData(officers, tblKey) {
    const conf = state.tables[tblKey];
    let list = [];

    if (tblKey === 'working') {
      list = officers.filter(o => o.isCurrentlyWorking);
    } else if (tblKey === 'retired') {
      list = officers.filter(o => o.isAlreadyRetired);
    } else {
      list = [...officers];
    }

    if (conf.recruitment && conf.recruitment !== 'ALL') {
      list = list.filter(o => o.recruitmentType && o.recruitmentType.includes(conf.recruitment));
    }

    if (conf.search) {
      const q = conf.search;
      list = list.filter(o =>
        String(o.seniorityNo).includes(q) ||
        o.name.toLowerCase().includes(q) ||
        (o.fatherOrHusband && o.fatherOrHusband.toLowerCase().includes(q)) ||
        (o.qualification && o.qualification.toLowerCase().includes(q)) ||
        (o.appointmentDate && o.appointmentDate.toLowerCase().includes(q)) ||
        (o.retirement && o.retirement.dateString.includes(q))
      );
    }

    list.sort((a, b) => {
      let valA, valB;
      switch (conf.sortCol) {
        case 'seniorityNo':
          valA = a.seniorityNo; valB = b.seniorityNo;
          break;
        case 'name':
          valA = a.name; valB = b.name;
          break;
        case 'dob':
          valA = a.dobYear * 10000 + a.dobMonth * 100 + a.dobDay;
          valB = b.dobYear * 10000 + b.dobMonth * 100 + b.dobDay;
          break;
        case 'retDate':
          valA = a.retirement.retDate.getTime();
          valB = b.retirement.retDate.getTime();
          break;
        default:
          valA = a.seniorityNo; valB = b.seniorityNo;
      }

      if (valA < valB) return conf.sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return conf.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  // 6. Generic Full Table Renderer
  function renderTable(officers, tblKey, tbodyEl, paginationEl) {
    const filtered = getFilteredTableData(officers, tblKey);
    const conf = state.tables[tblKey];

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / conf.pageSize) || 1;
    if (conf.page > totalPages) conf.page = totalPages;
    if (conf.page < 1) conf.page = 1;

    const startIdx = (conf.page - 1) * conf.pageSize;
    const pageItems = filtered.slice(startIdx, startIdx + conf.pageSize);

    const tableEl = tbodyEl.closest('.data-table');
    tableEl.querySelectorAll('th[data-sort]').forEach(th => {
      th.classList.remove('sorted');
      const arrow = th.querySelector('.sort-arrow');
      if (arrow) {
        if (th.dataset.sort === conf.sortCol) {
          th.classList.add('sorted');
          arrow.textContent = conf.sortDir === 'asc' ? '▲' : '▼';
        } else {
          arrow.textContent = '⇅';
        }
      }
    });

    if (pageItems.length === 0) {
      tbodyEl.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:2rem; color:var(--text-muted);">
            No matching records found.
          </td>
        </tr>
      `;
    } else {
      tbodyEl.innerHTML = pageItems.map(o => {
        const isWorking = o.isCurrentlyWorking;
        const statusBadge = isWorking
          ? `<span class="status-badge badge-still-working">In Service (${o.remainingYears} yrs)</span>`
          : `<span class="status-badge badge-already-retired">Retired</span>`;

        return `
          <tr class="${isWorking ? 'working-dark-row' : 'retired-grey-row'}" onclick="window.viewOfficerModal(${o.seniorityNo})">
            <td class="seniority-cell">${o.seniorityNo}</td>
            <td class="officer-name-cell">
              <span>${o.name}</span>
              <span class="officer-father-sub">${o.fatherOrHusband}</span>
            </td>
            <td>${o.dob}</td>
            <td>${o.qualification}</td>
            <td>${o.recruitmentType}</td>
            <td>${o.appointmentDate}</td>
            <td><strong>${o.retirement.dateString}</strong></td>
            <td>${statusBadge}</td>
            <td>
              <button class="btn-subtle" onclick="event.stopPropagation(); window.openObjectionModal(${o.seniorityNo});">
                Report
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (paginationEl) {
      const endItem = Math.min(startIdx + conf.pageSize, totalItems);
      paginationEl.innerHTML = `
        <div>
          Showing <strong>${totalItems === 0 ? 0 : startIdx + 1} - ${endItem}</strong> of <strong>${totalItems}</strong> records
        </div>
        <div class="pagination-controls">
          <button class="page-btn" ${conf.page <= 1 ? 'disabled' : ''} onclick="window.changePage('${tblKey}', 1)">First</button>
          <button class="page-btn" ${conf.page <= 1 ? 'disabled' : ''} onclick="window.changePage('${tblKey}', ${conf.page - 1})">Prev</button>
          <span style="font-weight:600; padding:0 0.4rem;">Page ${conf.page} of ${totalPages}</span>
          <button class="page-btn" ${conf.page >= totalPages ? 'disabled' : ''} onclick="window.changePage('${tblKey}', ${conf.page + 1})">Next</button>
          <button class="page-btn" ${conf.page >= totalPages ? 'disabled' : ''} onclick="window.changePage('${tblKey}', ${totalPages})">Last</button>
        </div>
      `;
    }
  }

  window.changePage = function (tblKey, newPage) {
    state.tables[tblKey].page = newPage;
    renderTablesOnly();
  };

  // 7. Officer Inspector Tab
  function renderInspectorList(query = '') {
    const officers = processOfficers();
    const filtered = officers.filter(o =>
      String(o.seniorityNo).includes(query) ||
      o.name.toLowerCase().includes(query) ||
      (o.fatherOrHusband && o.fatherOrHusband.toLowerCase().includes(query))
    );

    els.inspectorOfficerList.innerHTML = filtered.map(o => `
      <div class="officer-quick-item ${o.seniorityNo === state.selectedOfficerNo ? 'active' : ''}"
           onclick="window.selectOfficerForInspection(${o.seniorityNo})">
        <div>
          <strong style="color:var(--primary-navy);">${o.seniorityNo}.</strong> ${o.name}
        </div>
        <span class="status-badge ${o.isCurrentlyWorking ? 'badge-still-working' : 'badge-already-retired'}" style="font-size:0.65rem;">
          ${o.isCurrentlyWorking ? 'In Service' : 'Retired'}
        </span>
      </div>
    `).join('');
  }

  window.selectOfficerForInspection = function (sNo) {
    state.selectedOfficerNo = sNo;
    renderInspectorList(els.inspectorSearch?.value.toLowerCase().trim() || '');
    renderDossier(sNo);
  };

  function renderDossier(sNo) {
    const officers = processOfficers();
    const o = officers.find(x => x.seniorityNo === sNo) || officers[0];
    if (!o) return;

    const ret = o.retirement;
    const isRet = o.isAlreadyRetired;

    els.dossierContainer.innerHTML = `
      <div class="dossier-header">
        <div>
          <div class="dossier-name">${o.name}</div>
          <div style="color:var(--text-muted); font-size:0.9rem; margin-top:0.15rem;">
            Father / Husband: <strong>${o.fatherOrHusband}</strong>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <button class="btn btn-outline" style="font-size:0.78rem; padding:0.3rem 0.65rem;" onclick="window.openObjectionModal(${o.seniorityNo})">
            Discrepancy? Report Objection
          </button>
          <div class="dossier-rank">Seniority Rank: #${o.seniorityNo}</div>
        </div>
      </div>

      <div class="dossier-fields-grid">
        <div class="dossier-field">
          <div class="label">Date of Birth</div>
          <div class="val">${o.dob}</div>
        </div>

        <div class="dossier-field">
          <div class="label">Professional Qualification</div>
          <div class="val">${o.qualification}</div>
        </div>

        <div class="dossier-field">
          <div class="label">Recruitment Type</div>
          <div class="val">${o.recruitmentType}</div>
        </div>

        <div class="dossier-field">
          <div class="label">Current Status</div>
          <div class="val">${isRet ? '<span class="status-badge badge-already-retired">Retired</span>' : '<span class="status-badge badge-still-working">In Service</span>'}</div>
        </div>

        <div class="dossier-field" style="grid-column: span 2;">
          <div class="label">Substantive Appointment Date</div>
          <div class="val" style="font-size:0.9rem;">${o.appointmentDate}</div>
        </div>

        <div class="dossier-field" style="background:var(--primary-light); border-color:var(--border-strong);">
          <div class="label" style="color:var(--primary-blue);">Superannuation Date</div>
          <div class="val" style="color:var(--primary-navy); font-size:1.15rem;">${ret.dateString}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">
            (On attaining ${state.retirementAge} years age)
          </div>
        </div>

        <div class="dossier-field" style="background:${isRet ? 'var(--bg-secondary)' : 'var(--success-bg)'};">
          <div class="label" style="color:${isRet ? '#64748b' : 'var(--success-dark)'};">
            Remaining Service Duration
          </div>
          <div class="val" style="color:${isRet ? '#64748b' : 'var(--success-dark)'}; font-size:1.05rem;">
            ${isRet ? 'Already Superannuated' : `${o.remainingYears} Years (${o.remainingDays} Days)`}
          </div>
        </div>
      </div>
    `;
  }

  function renderInspector() {
    renderInspectorList('');
    renderDossier(state.selectedOfficerNo);
  }

  // Quick Modal Inspection
  window.viewOfficerModal = function (sNo) {
    const officers = processOfficers();
    const o = officers.find(x => x.seniorityNo === sNo);
    if (!o) return;

    const isRet = o.isAlreadyRetired;

    els.officerModalContent.innerHTML = `
      <div class="dossier-header">
        <div>
          <div class="dossier-name">${o.name}</div>
          <div style="color:var(--text-muted); font-size:0.85rem;">Father/Husband: ${o.fatherOrHusband}</div>
        </div>
        <div class="dossier-rank">Seniority No: #${o.seniorityNo}</div>
      </div>

      <div class="dossier-fields-grid" style="margin-top:1rem;">
        <div class="dossier-field"><div class="label">Date of Birth</div><div class="val">${o.dob}</div></div>
        <div class="dossier-field"><div class="label">Qualification</div><div class="val">${o.qualification}</div></div>
        <div class="dossier-field"><div class="label">Recruitment Type</div><div class="val">${o.recruitmentType}</div></div>
        <div class="dossier-field"><div class="label">Current Status</div><div class="val">${isRet ? 'Retired' : 'In Service'}</div></div>
        <div class="dossier-field" style="grid-column: span 2;"><div class="label">Appointment Date</div><div class="val">${o.appointmentDate}</div></div>
        <div class="dossier-field" style="background:var(--primary-light);"><div class="label">Superannuation Date</div><div class="val" style="color:var(--primary-navy);">${o.retirement.dateString}</div></div>
        <div class="dossier-field" style="background:${isRet ? '#f1f5f9' : 'var(--success-bg)'};"><div class="label">Remaining Service</div><div class="val" style="color:${isRet ? '#64748b' : 'var(--success-dark)'};">${isRet ? 'Retired' : `${o.remainingYears} Years (${o.remainingDays} Days)`}</div></div>
      </div>

      <div style="margin-top:1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <button class="btn btn-outline" style="color:#b45309; border-color:#f59e0b;" onclick="document.getElementById('officerDialog').close(); window.openObjectionModal(${o.seniorityNo})">
          Discrepancy? Report Objection
        </button>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-primary" onclick="window.goToInspector(${o.seniorityNo})">View Full Dossier</button>
          <button class="btn btn-outline" onclick="document.getElementById('officerDialog').close()">Close</button>
        </div>
      </div>
    `;

    els.officerDialog.showModal();
  };

  window.goToInspector = function (sNo) {
    els.officerDialog.close();
    state.selectedOfficerNo = sNo;
    switchTab('inspector');
  };

  // --------------------------------------------------------------------------
  // Objection System Logic
  // --------------------------------------------------------------------------
  function getStoredObjections() {
    try {
      return JSON.parse(localStorage.getItem('ayush_objections') || '[]');
    } catch {
      return [];
    }
  }

  function saveStoredObjections(list) {
    localStorage.setItem('ayush_objections', JSON.stringify(list));
    updateObjectionCountBadge();
  }

  function updateObjectionCountBadge() {
    const list = getStoredObjections();
    if (els.adminObjectionCount) {
      els.adminObjectionCount.textContent = list.length;
    }
  }

  // --------------------------------------------------------------------------
  // Disclaimer Popup Handlers
  // --------------------------------------------------------------------------
  window.closeDisclaimerPopup = function () {
    const el = document.getElementById('disclaimerPopup');
    if (el) {
      el.style.display = 'none';
    }
  };

  window.openDisclaimerPopup = function () {
    const el = document.getElementById('disclaimerPopup');
    if (el) {
      el.style.display = 'flex';
    }
  };

  window.openObjectionModal = function (sNo) {
    const officers = processOfficers();
    const o = officers.find(x => x.seniorityNo === sNo);
    if (!o) return;

    state.currentObjectionOfficer = o;
    if (els.objectionOfficerSummary) {
      els.objectionOfficerSummary.textContent = `Medical Officer: Seniority #${o.seniorityNo} - ${o.name} (Father/Husband: ${o.fatherOrHusband})`;
    }
    if (els.objectionSender) els.objectionSender.value = '';
    if (els.objectionCorrectVal) els.objectionCorrectVal.value = '';
    if (els.objectionRemarks) els.objectionRemarks.value = '';

    els.objectionDialog?.showModal();
  };

  window.submitObjection = function () {
    const o = state.currentObjectionOfficer;
    if (!o) return;

    const correctVal = els.objectionCorrectVal?.value.trim();
    if (!correctVal) {
      alert('Please enter the correct details.');
      return;
    }

    const objectionObj = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-GB'),
      seniorityNo: o.seniorityNo,
      name: o.name,
      field: els.objectionField?.value || 'General Detail',
      correctVal: correctVal,
      remarks: els.objectionRemarks?.value.trim() || '',
      sender: els.objectionSender?.value.trim() || 'Anonymous',
      resolved: false
    };

    const list = getStoredObjections();
    list.unshift(objectionObj);
    saveStoredObjections(list);

    els.objectionDialog?.close();
    alert('Objection recorded successfully. The portal administrator will review the submission.');
  };

  window.copyObjectionText = function () {
    const o = state.currentObjectionOfficer;
    if (!o) return;

    const field = els.objectionField?.value || 'General Detail';
    const correctVal = els.objectionCorrectVal?.value.trim() || 'Not specified';
    const remarks = els.objectionRemarks?.value.trim() || '';
    const sender = els.objectionSender?.value.trim() || '';

    const text = `[AYUSH Medical Officer Data Discrepancy Report]\n` +
      `Seniority No: #${o.seniorityNo}\n` +
      `Name: ${o.name}\n` +
      `Father/Husband: ${o.fatherOrHusband}\n` +
      `Discrepant Field: ${field}\n` +
      `Proposed Correct Value: ${correctVal}\n` +
      (remarks ? `Remarks/Reference: ${remarks}\n` : '') +
      (sender ? `Reported By: ${sender}\n` : '') +
      `Date: ${new Date().toLocaleDateString('en-GB')}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Objection details copied to clipboard!');
      }).catch(() => {});
    }

    // Open mailto link
    const mailSubject = encodeURIComponent(`Discrepancy Report: Seniority #${o.seniorityNo} ${o.name}`);
    const mailBody = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${mailSubject}&body=${mailBody}`;
  };

  function renderAdminObjections() {
    const list = getStoredObjections();
    if (!els.adminObjectionsBody) return;

    if (list.length === 0) {
      els.adminObjectionsBody.innerHTML = `
        <tr><td colspan="7" style="text-align:center; padding:1.5rem; color:var(--text-muted);">
          No objections received yet.
        </td></tr>
      `;
      return;
    }

    els.adminObjectionsBody.innerHTML = list.map(item => `
      <tr>
        <td>${item.date}</td>
        <td><strong>#${item.seniorityNo}</strong></td>
        <td>${item.name}</td>
        <td><span class="status-badge" style="background:#fffbeb; color:#92400e;">${item.field}</span></td>
        <td><strong>${item.correctVal}</strong></td>
        <td>${item.remarks || '-'}</td>
        <td>
          <button class="btn-subtle" onclick="window.deleteObjection(${item.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  window.deleteObjection = function (id) {
    let list = getStoredObjections();
    list = list.filter(x => x.id !== id);
    saveStoredObjections(list);
    renderAdminObjections();
  };

  window.exportObjectionsCSV = function () {
    const list = getStoredObjections();
    if (list.length === 0) {
      alert('No objections available to download.');
      return;
    }

    const headers = ['Date', 'Seniority No', 'Officer Name', 'Discrepant Field', 'Proposed Details', 'Remarks', 'Reporter'];
    const rows = list.map(x => [
      x.date,
      x.seniorityNo,
      `"${x.name}"`,
      `"${x.field}"`,
      `"${x.correctVal}"`,
      `"${x.remarks}"`,
      `"${x.sender}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    downloadBlob(csvContent, `Received_Objections_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // --------------------------------------------------------------------------
  // Admin Authentication & File Upload (Excel / CSV)
  // --------------------------------------------------------------------------
  window.checkAdminPin = function () {
    const entered = els.adminPinInput?.value;
    const correctPin = localStorage.getItem('ayush_admin_pin') || 'admin123';

    if (entered === correctPin) {
      els.adminPinError.style.display = 'none';
      els.adminAuthDialog?.close();
      els.adminPanelDialog?.showModal();
      renderAdminObjections();
    } else {
      els.adminPinError.style.display = 'block';
    }
  };

  window.changeAdminPin = function () {
    const newPin = document.getElementById('newAdminPin')?.value.trim();
    if (!newPin || newPin.length < 4) {
      alert('Please enter a new security PIN with at least 4 characters.');
      return;
    }
    localStorage.setItem('ayush_admin_pin', newPin);
    alert('Security PIN updated successfully!');
    document.getElementById('newAdminPin').value = '';
  };

  // Parse Excel / CSV date helper
  function parseDateValue(val) {
    if (!val) return null;
    
    // Check if Excel serial date number
    if (typeof val === 'number' || (!isNaN(val) && !String(val).includes('/') && !String(val).includes('-'))) {
      const num = parseFloat(val);
      if (num > 1000 && num < 100000) {
        // Excel base 1899-12-30
        const dt = new Date(Math.round((num - 25569) * 86400 * 1000));
        const d = dt.getUTCDate();
        const m = dt.getUTCMonth() + 1;
        const y = dt.getUTCFullYear();
        return {
          formatted: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
          day: d,
          month: m,
          year: y
        };
      }
    }

    const str = String(val).trim();
    const parts = str.split(/[/.-]/);
    if (parts.length === 3) {
      let d, m, y;
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      } else {
        // DD/MM/YYYY
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        y = parseInt(parts[2], 10);
      }

      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return {
          formatted: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`,
          day: d,
          month: m,
          year: y
        };
      }
    }
    return null;
  }

  // Handle uploaded file via SheetJS
  function handleFile(file) {
    if (!file) return;

    if (els.uploadStatusMsg) {
      els.uploadStatusMsg.style.display = 'block';
      els.uploadStatusMsg.textContent = `Reading file: ${file.name}...`;
      els.uploadStatusMsg.style.color = 'var(--text-muted)';
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        if (typeof XLSX === 'undefined') {
          throw new Error('XLSX parser library not ready.');
        }

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (!rawJson || rawJson.length < 2) {
          throw new Error('No valid data found in file.');
        }

        // Find header row and map columns
        let headerRowIdx = -1;
        let colMap = { sNo: -1, name: -1, father: -1, dob: -1, qual: -1, recruit: -1, appt: -1 };

        for (let r = 0; r < Math.min(10, rawJson.length); r++) {
          const row = rawJson[r].map(cell => String(cell).toLowerCase().trim());
          const hasName = row.some(c => c.includes('नाम') || c.includes('name'));
          const hasSno = row.some(c => c.includes('क्रमांक') || c.includes('seniority') || c.includes('sno') || c.includes('no'));

          if (hasName && hasSno) {
            headerRowIdx = r;
            row.forEach((c, idx) => {
              if (c.includes('क्रमांक') || c.includes('seniority') || c.includes('sno') || c.includes('no')) colMap.sNo = idx;
              else if (c.includes('चिकित्साधिकारी') || c.includes('नाम') || c.includes('name')) {
                if (c.includes('पिता') || c.includes('पति') || c.includes('father')) colMap.father = idx;
                else if (colMap.name === -1) colMap.name = idx;
              }
              else if (c.includes('पिता') || c.includes('पति') || c.includes('father') || c.includes('husband')) colMap.father = idx;
              else if (c.includes('जन्म') || c.includes('dob') || c.includes('birth')) colMap.dob = idx;
              else if (c.includes('योग्यता') || c.includes('qualification')) colMap.qual = idx;
              else if (c.includes('भर्ती') || c.includes('recruitment')) colMap.recruit = idx;
              else if (c.includes('नियुक्ति') || c.includes('appointment')) colMap.appt = idx;
            });
            break;
          }
        }

        // Fallback default index mapping if header not found
        if (headerRowIdx === -1) {
          headerRowIdx = 0;
          colMap = { sNo: 0, name: 1, father: 2, dob: 3, qual: 4, recruit: 5, appt: 6 };
        }

        const parsedOfficers = [];
        for (let r = headerRowIdx + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || row.length === 0) continue;

          const sNoRaw = colMap.sNo !== -1 ? row[colMap.sNo] : r;
          const sNo = parseInt(String(sNoRaw).replace(/[^\d]/g, ''), 10);
          const name = colMap.name !== -1 ? String(row[colMap.name]).trim() : '';
          const father = colMap.father !== -1 ? String(row[colMap.father]).trim() : '';
          const dobRaw = colMap.dob !== -1 ? row[colMap.dob] : '';
          const qual = colMap.qual !== -1 ? String(row[colMap.qual]).trim() : 'बी.ए.एम.एस';
          const recruit = colMap.recruit !== -1 ? String(row[colMap.recruit]).trim() : 'लोक सेवा आयोग';
          const appt = colMap.appt !== -1 ? String(row[colMap.appt]).trim() : '-';

          if (!name || isNaN(sNo)) continue;

          const parsedDob = parseDateValue(dobRaw);
          if (!parsedDob) continue;

          parsedOfficers.push({
            seniorityNo: sNo,
            name: name,
            fatherOrHusband: father,
            dob: parsedDob.formatted,
            dobDay: parsedDob.day,
            dobMonth: parsedDob.month,
            dobYear: parsedDob.year,
            qualification: qual,
            recruitmentType: recruit,
            appointmentDate: appt
          });
        }

        if (parsedOfficers.length === 0) {
          throw new Error('No valid records (name, DOB, seniority) could be parsed from file.');
        }

        state.pendingUploadOfficers = parsedOfficers;

        // Render preview
        if (els.uploadStatusMsg) {
          els.uploadStatusMsg.style.display = 'block';
          els.uploadStatusMsg.style.color = '#166534';
          els.uploadStatusMsg.textContent = `Success: Found ${parsedOfficers.length} valid records. Please review the preview below.`;
        }

        if (els.previewCountBadge) {
          els.previewCountBadge.textContent = `${parsedOfficers.length} records found`;
        }

        if (els.uploadPreviewBody) {
          els.uploadPreviewBody.innerHTML = parsedOfficers.slice(0, 15).map(o => `
            <tr>
              <td>#${o.seniorityNo}</td>
              <td><strong>${o.name}</strong></td>
              <td>${o.fatherOrHusband}</td>
              <td>${o.dob}</td>
              <td>${o.qualification}</td>
              <td>${o.appointmentDate}</td>
            </tr>
          `).join('') + (parsedOfficers.length > 15 ? `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">... and ${parsedOfficers.length - 15} more records</td></tr>` : '');
        }

        if (els.uploadPreviewSection) {
          els.uploadPreviewSection.style.display = 'block';
        }

      } catch (err) {
        console.error('File parsing error:', err);
        if (els.uploadStatusMsg) {
          els.uploadStatusMsg.style.display = 'block';
          els.uploadStatusMsg.style.color = '#dc2626';
          els.uploadStatusMsg.textContent = `Error: ${err.message || 'Failed to parse file.'}`;
        }
      }
    };

    reader.readAsArrayBuffer(file);
  }

  window.cancelUploadPreview = function () {
    state.pendingUploadOfficers = null;
    if (els.uploadPreviewSection) els.uploadPreviewSection.style.display = 'none';
    if (els.uploadStatusMsg) els.uploadStatusMsg.style.display = 'none';
    if (els.sheetFileInput) els.sheetFileInput.value = '';
  };

  window.applyUploadedData = function () {
    if (!state.pendingUploadOfficers || state.pendingUploadOfficers.length === 0) {
      alert('No uploaded data available to apply.');
      return;
    }

    const mode = document.querySelector('input[name="uploadMode"]:checked')?.value || 'merge';
    let finalOfficers = [];

    if (mode === 'replace') {
      finalOfficers = [...state.pendingUploadOfficers];
    } else {
      // Merge mode
      const currentList = getRawOfficers();
      const officerMap = new Map();
      currentList.forEach(o => officerMap.set(o.seniorityNo, o));
      
      // Upsert pending officers
      state.pendingUploadOfficers.forEach(newO => {
        officerMap.set(newO.seniorityNo, newO);
      });

      finalOfficers = Array.from(officerMap.values());
    }

    // Sort by seniority number
    finalOfficers.sort((a, b) => a.seniorityNo - b.seniorityNo);

    // Save to localStorage
    localStorage.setItem('ayush_custom_officers', JSON.stringify(finalOfficers));

    window.cancelUploadPreview();
    els.adminPanelDialog?.close();

    // Re-render whole dashboard
    render();
    alert(`Success: Applied data for ${finalOfficers.length} medical officers successfully!`);
  };

  window.downloadUpdatedDataJs = function () {
    const raw = getRawOfficers();
    const content = `// Ayurvedic & Unani Medical Officers Seniority List Dataset\n` +
      `// Updated on ${new Date().toLocaleString()}\n` +
      `window.OFFICERS_DATA = ` + JSON.stringify(raw, null, 2) + `;\n`;

    downloadBlob(content, 'data.js');
  };

  window.resetToDefaultData = function () {
    if (confirm('Are you sure you want to remove all custom additions and reset to default 508 records?')) {
      localStorage.removeItem('ayush_custom_officers');
      els.adminPanelDialog?.close();
      render();
      alert('Original 508 records restored successfully.');
    }
  };

  // CSV Export
  function exportTableToCSV(tblKey) {
    const officers = processOfficers();
    const data = getFilteredTableData(officers, tblKey);

    const headers = [
      'Seniority No',
      'Medical Officer Name',
      'Father / Husband Name',
      'Date of Birth',
      'Professional Qualification',
      'Recruitment Type',
      'Appointment Date',
      'Superannuation Date',
      'Status'
    ];

    const rows = data.map(o => [
      o.seniorityNo,
      `"${o.name}"`,
      `"${o.fatherOrHusband}"`,
      o.dob,
      `"${o.qualification}"`,
      `"${o.recruitmentType}"`,
      `"${o.appointmentDate}"`,
      o.retirement.dateString,
      o.isCurrentlyWorking ? 'In Service' : 'Retired'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    downloadBlob(csvContent, `Medical_Officers_${tblKey}.csv`);
  }

  function exportYearToCSV(year) {
    const officers = processOfficers();
    const data = officers.filter(o => o.retirement.retYear === year);

    const headers = [
      'Seniority No',
      'Medical Officer Name',
      'Father / Husband Name',
      'Date of Birth',
      'Qualification',
      'Recruitment Type',
      'Appointment Date',
      'Superannuation Date',
      'Status'
    ];

    const rows = data.map(o => [
      o.seniorityNo,
      `"${o.name}"`,
      `"${o.fatherOrHusband}"`,
      o.dob,
      `"${o.qualification}"`,
      `"${o.recruitmentType}"`,
      `"${o.appointmentDate}"`,
      o.retirement.dateString,
      o.isCurrentlyWorking ? 'In Service' : 'Retired'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    downloadBlob(csvContent, `Retirements_Year_${year}.csv`);
  }

  function downloadBlob(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Render Full Tables Only
  function renderTablesOnly() {
    const officers = processOfficers();
    renderTable(officers, 'working', els.workingTableBody, document.getElementById('workingPagination'));
    renderTable(officers, 'retired', els.retiredTableBody, document.getElementById('retiredPagination'));
    renderTable(officers, 'master', els.masterTableBody, document.getElementById('masterPagination'));
  }

  // Master Render
  function render() {
    const officers = processOfficers();
    renderKPIs(officers);
    renderCurrentYearMonitor(officers);
    renderPoleGraph(officers);
    renderDualYearLists(officers);
    renderTablesOnly();

    if (state.activeTab === 'inspector') {
      renderInspector();
    }
  }

  // Boot
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(state.theme);
    initControls();
    render();
  });

})();
