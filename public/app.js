/**
 * LeadsFlow - Intelligent Leads Tracking Portal & Analytics JavaScript
 */

(function () {
  'use strict';

  // Dynamic API Base URL resolver:
  const isDirectPort = window.location.origin && window.location.origin.includes(':3000');
  const API_BASE = isDirectPort ? '' : 'http://localhost:3000';

  // Application State
  const state = {
    currentView: 'leads', // 'leads' or 'analytics'
    timeframe: 'daily',   // 'daily', 'weekly', 'monthly'
    search: '',
    status: '',
    page: 1,
    limit: 10,
    totalPages: 1,
    totalLeads: 0,
    currentLead: null,
    searchTimeout: null,
    theme: localStorage.getItem('theme') || 'dark',
    analyticsData: null,
    charts: {
      trend: null,
      donut: null,
      funnel: null
    }
  };

  // DOM Elements
  const elements = {
    // Top Nav & Theme
    themeToggleBtn: document.getElementById('btn-theme-toggle'),
    sunIcon: document.querySelector('.sun-icon'),
    moonIcon: document.querySelector('.moon-icon'),
    apiStatus: document.getElementById('api-status'),
    tabLeadsBtn: document.getElementById('btn-tab-leads'),
    tabAnalyticsBtn: document.getElementById('btn-tab-analytics'),
    viewLeads: document.getElementById('view-leads'),
    viewAnalytics: document.getElementById('view-analytics'),

    // Directory Controls
    searchInput: document.getElementById('input-search'),
    clearSearchBtn: document.getElementById('btn-clear-search'),
    statusPills: document.getElementById('status-pills'),
    selectLimit: document.getElementById('select-limit'),
    refreshBtn: document.getElementById('btn-refresh'),
    leadsTbody: document.getElementById('leads-tbody'),
    emptyState: document.getElementById('empty-state'),
    tableLoading: document.getElementById('table-loading'),
    resultsCount: document.getElementById('results-count'),
    paginationBar: document.getElementById('pagination-bar'),
    paginationInfo: document.getElementById('pagination-info'),
    pageNumbers: document.getElementById('page-numbers'),
    prevPageBtn: document.getElementById('btn-prev-page'),
    nextPageBtn: document.getElementById('btn-next-page'),
    
    // Directory Quick Stats
    statTotal: document.getElementById('stat-total'),
    statNew: document.getElementById('stat-new'),
    statContacted: document.getElementById('stat-contacted'),
    statQualified: document.getElementById('stat-qualified'),
    statLost: document.getElementById('stat-lost'),

    // Create Modal
    openCreateBtn: document.getElementById('btn-open-create-lead'),
    emptyAddBtn: document.getElementById('btn-empty-add'),
    createModal: document.getElementById('modal-create-lead'),
    closeCreateModalBtn: document.getElementById('btn-close-create-modal'),
    cancelCreateBtn: document.getElementById('btn-cancel-create'),
    createForm: document.getElementById('form-create-lead'),
    createName: document.getElementById('create-name'),
    createEmail: document.getElementById('create-email'),
    createPhone: document.getElementById('create-phone'),
    createStatus: document.getElementById('create-status'),
    errCreateName: document.getElementById('err-create-name'),
    errCreateEmail: document.getElementById('err-create-email'),
    errCreatePhone: document.getElementById('err-create-phone'),

    // Lead Detail Drawer
    drawer: document.getElementById('drawer-lead-detail'),
    closeDrawerBtn: document.getElementById('btn-close-drawer'),
    drawerLeadName: document.getElementById('drawer-lead-name'),
    drawerLeadStatus: document.getElementById('drawer-lead-status'),
    drawerStatusSaved: document.getElementById('drawer-status-saved'),
    drawerLeadCreated: document.getElementById('drawer-lead-created'),
    drawerLeadEmail: document.getElementById('drawer-lead-email'),
    drawerLeadPhone: document.getElementById('drawer-lead-phone'),
    deleteLeadBtn: document.getElementById('btn-delete-lead'),
    
    // Notes
    notesCountBadge: document.getElementById('notes-count-badge'),
    addNoteForm: document.getElementById('form-add-note'),
    noteContentInput: document.getElementById('input-note-content'),
    errNoteContent: document.getElementById('err-note-content'),
    notesTimeline: document.getElementById('notes-timeline'),

    // Analytics Dashboard Elements
    timeframePills: document.getElementById('timeframe-pills'),
    kpiConversionRate: document.getElementById('kpi-conversion-rate'),
    kpiConversionSub: document.getElementById('kpi-conversion-sub'),
    kpiConversionBar: document.getElementById('kpi-conversion-bar'),
    kpiContactRate: document.getElementById('kpi-contact-rate'),
    kpiContactBar: document.getElementById('kpi-contact-bar'),
    kpiTotalNotes: document.getElementById('kpi-total-notes'),
    kpiAvgNotes: document.getElementById('kpi-avg-notes'),
    kpiAvgNotesBar: document.getElementById('kpi-avg-notes-bar'),
    chartTrendSubtitle: document.getElementById('chart-trend-subtitle'),
    chartTrendsCanvas: document.getElementById('chart-trends'),
    chartStatusDonutCanvas: document.getElementById('chart-status-donut'),
    chartFunnelCanvas: document.getElementById('chart-funnel'),
    donutSummaryPills: document.getElementById('donut-summary-pills'),
    analyticsActivityFeed: document.getElementById('analytics-activity-feed'),

    // Toast
    toastContainer: document.getElementById('toast-container')
  };

  // Initialize
  function init() {
    applyTheme(state.theme);
    bindEvents();
    checkApiHealth();
    loadDashboard();
  }

  // Health check to update indicator
  async function checkApiHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        if (elements.apiStatus) {
          elements.apiStatus.innerHTML = `
            <span class="status-indicator" style="background:#10B981;box-shadow:0 0 8px #10B981;"></span>
            <span class="status-text" style="color:#34D399;">API Online</span>
          `;
        }
      }
    } catch {
      if (elements.apiStatus) {
        elements.apiStatus.innerHTML = `
          <span class="status-indicator" style="background:#EF4444;box-shadow:0 0 8px #EF4444;"></span>
          <span class="status-text" style="color:#F87171;">API Offline</span>
        `;
      }
    }
  }

  // Bind UI Events
  function bindEvents() {
    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // View Navigation Tabs Switcher
    elements.tabLeadsBtn.addEventListener('click', () => switchView('leads'));
    elements.tabAnalyticsBtn.addEventListener('click', () => switchView('analytics'));

    // Timeframe Selector in Analytics View
    if (elements.timeframePills) {
      elements.timeframePills.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;

        elements.timeframePills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        state.timeframe = pill.dataset.timeframe || 'daily';
        loadAnalytics(state.timeframe);
      });
    }

    // Live Search with Debounce
    elements.searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      elements.clearSearchBtn.classList.toggle('hidden', val.length === 0);
      
      clearTimeout(state.searchTimeout);
      state.searchTimeout = setTimeout(() => {
        state.search = val;
        state.page = 1;
        fetchLeads();
      }, 300);
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      elements.clearSearchBtn.classList.add('hidden');
      state.search = '';
      state.page = 1;
      fetchLeads();
    });

    // Status Filter Tabs
    elements.statusPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill) return;

      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      state.status = pill.dataset.status || '';
      state.page = 1;
      fetchLeads();
    });

    // Limit selection
    elements.selectLimit.addEventListener('change', (e) => {
      state.limit = parseInt(e.target.value, 10);
      state.page = 1;
      fetchLeads();
    });

    // Refresh button
    elements.refreshBtn.addEventListener('click', () => {
      loadDashboard();
      if (state.currentView === 'analytics') {
        loadAnalytics(state.timeframe);
      }
      checkApiHealth();
      showToast('Data refreshed');
    });

    // Pagination
    elements.prevPageBtn.addEventListener('click', () => {
      if (state.page > 1) {
        state.page--;
        fetchLeads();
      }
    });

    elements.nextPageBtn.addEventListener('click', () => {
      if (state.page < state.totalPages) {
        state.page++;
        fetchLeads();
      }
    });

    // Create Modal Open/Close
    elements.openCreateBtn.addEventListener('click', openCreateModal);
    elements.emptyAddBtn.addEventListener('click', openCreateModal);
    elements.closeCreateModalBtn.addEventListener('click', closeCreateModal);
    elements.cancelCreateBtn.addEventListener('click', closeCreateModal);
    elements.createModal.addEventListener('click', (e) => {
      if (e.target === elements.createModal) closeCreateModal();
    });

    // Create Form Submit
    elements.createForm.addEventListener('submit', handleCreateLead);

    // Detail Drawer Close
    elements.closeDrawerBtn.addEventListener('click', closeDrawer);
    elements.drawer.addEventListener('click', (e) => {
      if (e.target === elements.drawer) closeDrawer();
    });

    // Drawer Status Change
    elements.drawerLeadStatus.addEventListener('change', handleStatusUpdate);

    // Delete Lead
    elements.deleteLeadBtn.addEventListener('click', handleDeleteLead);

    // Add Note Form Submit
    elements.addNoteForm.addEventListener('submit', handleAddNote);

    // Keyboard Shortcuts (Esc closes modals)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCreateModal();
        closeDrawer();
      }
    });
  }

  // Switch between Leads Directory and Analytics Dashboard
  function switchView(viewName) {
    state.currentView = viewName;
    if (viewName === 'leads') {
      elements.tabLeadsBtn.classList.add('active');
      elements.tabAnalyticsBtn.classList.remove('active');
      elements.viewLeads.classList.remove('hidden');
      elements.viewAnalytics.classList.add('hidden');
    } else {
      elements.tabAnalyticsBtn.classList.add('active');
      elements.tabLeadsBtn.classList.remove('active');
      elements.viewAnalytics.classList.remove('hidden');
      elements.viewLeads.classList.add('hidden');
      loadAnalytics(state.timeframe);
    }
  }

  // Main Dashboard Loader
  async function loadDashboard() {
    await Promise.all([fetchStats(), fetchLeads()]);
  }

  // Fetch KPI Stats for Directory
  async function fetchStats() {
    try {
      const res = await fetch(`${API_BASE}/api/leads/stats`);
      const data = await res.json();
      if (data.success && data.data) {
        if (elements.statTotal) elements.statTotal.textContent = data.data.total;
        if (elements.statNew) elements.statNew.textContent = data.data.new;
        if (elements.statContacted) elements.statContacted.textContent = data.data.contacted;
        if (elements.statQualified) elements.statQualified.textContent = data.data.qualified;
        if (elements.statLost) elements.statLost.textContent = data.data.lost;
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  }

  // Fetch Leads List with Filter & Pagination
  async function fetchLeads() {
    if (elements.tableLoading) elements.tableLoading.classList.remove('hidden');

    const params = new URLSearchParams({
      page: state.page,
      limit: state.limit
    });

    if (state.search) params.append('search', state.search);
    if (state.status) params.append('status', state.status);

    let json;
    try {
      const res = await fetch(`${API_BASE}/api/leads?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      json = await res.json();
    } catch (err) {
      console.error('Error loading leads:', err);
      showToast('Network error: ensure server is running (npm run dev) at http://localhost:3000', 'error');
      if (elements.tableLoading) elements.tableLoading.classList.add('hidden');
      return;
    } finally {
      if (elements.tableLoading) elements.tableLoading.classList.add('hidden');
    }

    try {
      if (json && json.success) {
        state.totalPages = json.pagination?.totalPages || 1;
        state.totalLeads = json.pagination?.total || 0;
        renderLeadsTable(json.data || []);
        if (json.pagination) renderPagination(json.pagination);
      } else {
        showToast(json?.error || 'Failed to fetch leads', 'error');
      }
    } catch (renderErr) {
      console.error('Error rendering leads table:', renderErr);
    }
  }

  // Render Leads Table
  function renderLeadsTable(leads) {
    if (!elements.leadsTbody) return;
    elements.leadsTbody.innerHTML = '';
    
    if (elements.resultsCount) {
      elements.resultsCount.textContent = `Showing ${leads.length} of ${state.totalLeads} leads`;
    }

    if (leads.length === 0) {
      if (elements.emptyState) elements.emptyState.classList.remove('hidden');
      if (elements.paginationBar) elements.paginationBar.classList.add('hidden');
      return;
    }

    if (elements.emptyState) elements.emptyState.classList.add('hidden');
    if (elements.paginationBar) elements.paginationBar.classList.remove('hidden');

    leads.forEach((lead) => {
      const tr = document.createElement('tr');
      tr.dataset.id = lead.id;

      const dateStr = formatDate(lead.createdAt);

      tr.innerHTML = `
        <td class="lead-name-cell">
          <strong>${escapeHtml(lead.name)}</strong>
        </td>
        <td class="lead-email-cell">
          <a href="mailto:${escapeHtml(lead.email)}" class="email-link">${escapeHtml(lead.email)}</a>
        </td>
        <td class="lead-phone-cell">${escapeHtml(lead.phone)}</td>
        <td>
          <span class="status-badge status-${lead.status}">${lead.status}</span>
        </td>
        <td class="date-cell">${dateStr}</td>
        <td class="text-right">
          <div class="action-buttons">
            <button class="btn btn-secondary btn-sm btn-view-lead" data-id="${lead.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>View & Notes</span>
            </button>
            <button class="btn btn-icon btn-sm btn-delete-row" data-id="${lead.id}" title="Delete lead">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-view-lead').addEventListener('click', () => openLeadDrawer(lead.id));
      tr.querySelector('.btn-delete-row').addEventListener('click', () => confirmAndDeleteLead(lead.id, lead.name));

      elements.leadsTbody.appendChild(tr);
    });
  }

  // Render Pagination Controls
  function renderPagination(pagination) {
    const { page, totalPages, hasNextPage, hasPrevPage, total } = pagination;

    if (elements.prevPageBtn) elements.prevPageBtn.disabled = !hasPrevPage;
    if (elements.nextPageBtn) elements.nextPageBtn.disabled = !hasNextPage;
    if (elements.paginationInfo) {
      elements.paginationInfo.textContent = `Page ${page} of ${totalPages} (${total} total leads)`;
    }

    if (!elements.pageNumbers) return;
    elements.pageNumbers.innerHTML = '';
    const maxButtons = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      const btn = document.createElement('button');
      btn.className = `page-btn ${p === page ? 'active' : ''}`;
      btn.textContent = p;
      btn.addEventListener('click', () => {
        if (state.page !== p) {
          state.page = p;
          fetchLeads();
        }
      });
      elements.pageNumbers.appendChild(btn);
    }
  }

  // ==============================================================
  // ADVANCED ANALYTICS DASHBOARD & CHART.JS INTEGRATION
  // ==============================================================

  async function loadAnalytics(timeframe = 'daily') {
    try {
      const res = await fetch(`${API_BASE}/api/leads/analytics?timeframe=${timeframe}`);
      const json = await res.json();

      if (json.success && json.data) {
        state.analyticsData = json.data;
        renderAnalyticsKPIs(json.data.metrics, json.data.statusBreakdown);
        renderCharts(json.data);
        renderRecentActivities(json.data.recentActivities);
      } else {
        showToast(json.error || 'Failed to load analytics', 'error');
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      showToast('Error loading analytics data', 'error');
    }
  }

  function renderAnalyticsKPIs(metrics, statusBreakdown) {
    if (!metrics) return;

    // Conversion Rate
    if (elements.kpiConversionRate) elements.kpiConversionRate.textContent = `${metrics.conversionRate}%`;
    if (elements.kpiConversionSub) elements.kpiConversionSub.textContent = `${statusBreakdown?.qualified || 0} of ${metrics.totalLeads} qualified`;
    if (elements.kpiConversionBar) elements.kpiConversionBar.style.width = `${Math.min(100, metrics.conversionRate)}%`;

    // Engagement / Contact Rate
    if (elements.kpiContactRate) elements.kpiContactRate.textContent = `${metrics.contactRate}%`;
    if (elements.kpiContactBar) elements.kpiContactBar.style.width = `${Math.min(100, metrics.contactRate)}%`;

    // Notes Touchpoints
    if (elements.kpiTotalNotes) elements.kpiTotalNotes.textContent = metrics.totalNotes;

    // Avg Notes per Lead
    if (elements.kpiAvgNotes) elements.kpiAvgNotes.textContent = metrics.avgNotesPerLead.toFixed(1);
    if (elements.kpiAvgNotesBar) {
      const barWidth = Math.min(100, (metrics.avgNotesPerLead / 5) * 100);
      elements.kpiAvgNotesBar.style.width = `${barWidth}%`;
    }

    // Subtitle update
    if (elements.chartTrendSubtitle) {
      const periodLabel = state.timeframe === 'daily' 
        ? 'daily intervals over the last 14 days' 
        : state.timeframe === 'weekly' 
          ? 'weekly intervals over the last 8 weeks' 
          : 'monthly intervals over the last 6 months';
      elements.chartTrendSubtitle.textContent = `Volume of prospects acquired across ${periodLabel}`;
    }
  }

  function getChartThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      textColor: isLight ? '#475569' : '#9CA3AF',
      gridColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
      tooltipBg: isLight ? '#FFFFFF' : '#1F2937',
      tooltipText: isLight ? '#0F172A' : '#F9FAFB',
      borderColor: isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
    };
  }

  function renderCharts(data) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet');
      return;
    }

    const themeColors = getChartThemeColors();

    // 1. Lead Acquisition Trend Chart (Multi-bar/line)
    renderTrendChart(data.trends, themeColors);

    // 2. Status Distribution Donut Chart
    renderDonutChart(data.statusBreakdown, data.metrics.totalLeads, themeColors);

    // 3. Pipeline Funnel Bar Chart
    renderFunnelChart(data.statusBreakdown, themeColors);
  }

  function renderTrendChart(trends, themeColors) {
    if (!elements.chartTrendsCanvas) return;

    if (state.charts.trend) {
      state.charts.trend.destroy();
    }

    const labels = trends.map(t => t.label);
    const newCounts = trends.map(t => t.new);
    const contactedCounts = trends.map(t => t.contacted);
    const qualifiedCounts = trends.map(t => t.qualified);
    const lostCounts = trends.map(t => t.lost);

    const ctx = elements.chartTrendsCanvas.getContext('2d');
    state.charts.trend = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'New',
            data: newCounts,
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            borderRadius: 4,
            stack: 'pipeline'
          },
          {
            label: 'Contacted',
            data: contactedCounts,
            backgroundColor: 'rgba(245, 158, 11, 0.85)',
            borderRadius: 4,
            stack: 'pipeline'
          },
          {
            label: 'Qualified',
            data: qualifiedCounts,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderRadius: 4,
            stack: 'pipeline'
          },
          {
            label: 'Lost',
            data: lostCounts,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            borderRadius: 4,
            stack: 'pipeline'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: themeColors.tooltipText,
            bodyColor: themeColors.tooltipText,
            borderColor: themeColors.borderColor,
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { color: themeColors.textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: themeColors.gridColor },
            ticks: { 
              color: themeColors.textColor,
              stepSize: 1,
              font: { family: 'Plus Jakarta Sans', size: 11 }
            }
          }
        }
      }
    });
  }

  function renderDonutChart(statusBreakdown, totalLeads, themeColors) {
    if (!elements.chartStatusDonutCanvas) return;

    if (state.charts.donut) {
      state.charts.donut.destroy();
    }

    const counts = [
      statusBreakdown.new || 0,
      statusBreakdown.contacted || 0,
      statusBreakdown.qualified || 0,
      statusBreakdown.lost || 0
    ];

    const ctx = elements.chartStatusDonutCanvas.getContext('2d');
    state.charts.donut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['New', 'Contacted', 'Qualified', 'Lost'],
        datasets: [{
          data: counts,
          backgroundColor: [
            '#3B82F6',
            '#F59E0B',
            '#10B981',
            '#EF4444'
          ],
          borderColor: themeColors.tooltipBg,
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: themeColors.tooltipText,
            bodyColor: themeColors.tooltipText,
            borderColor: themeColors.borderColor,
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const val = context.raw || 0;
                const pct = totalLeads > 0 ? ((val / totalLeads) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    // Render Summary Pills below donut
    if (elements.donutSummaryPills) {
      elements.donutSummaryPills.innerHTML = `
        <span class="donut-pill"><span style="color:#60A5FA;">●</span> New: ${statusBreakdown.new}</span>
        <span class="donut-pill"><span style="color:#FBBF24;">●</span> Contacted: ${statusBreakdown.contacted}</span>
        <span class="donut-pill"><span style="color:#34D399;">●</span> Qualified: ${statusBreakdown.qualified}</span>
        <span class="donut-pill"><span style="color:#F87171;">●</span> Lost: ${statusBreakdown.lost}</span>
      `;
    }
  }

  function renderFunnelChart(statusBreakdown, themeColors) {
    if (!elements.chartFunnelCanvas) return;

    if (state.charts.funnel) {
      state.charts.funnel.destroy();
    }

    const ctx = elements.chartFunnelCanvas.getContext('2d');
    state.charts.funnel = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['1. New Leads', '2. Contacted', '3. Qualified (Won)', '4. Lost / Inactive'],
        datasets: [{
          label: 'Prospect Volume',
          data: [
            statusBreakdown.new || 0,
            statusBreakdown.contacted || 0,
            statusBreakdown.qualified || 0,
            statusBreakdown.lost || 0
          ],
          backgroundColor: [
            'rgba(59, 130, 246, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(239, 68, 68, 0.85)'
          ],
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: themeColors.tooltipText,
            bodyColor: themeColors.tooltipText,
            borderColor: themeColors.borderColor,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: themeColors.gridColor },
            ticks: { color: themeColors.textColor, stepSize: 1 }
          },
          y: {
            grid: { display: false },
            ticks: { color: themeColors.textColor, font: { weight: '600' } }
          }
        }
      }
    });
  }

  function renderRecentActivities(activities) {
    if (!elements.analyticsActivityFeed) return;
    elements.analyticsActivityFeed.innerHTML = '';

    if (!activities || activities.length === 0) {
      elements.analyticsActivityFeed.innerHTML = `
        <div class="empty-notes">
          <p>No recent activity notes found.</p>
        </div>
      `;
      return;
    }

    activities.forEach(item => {
      const card = document.createElement('div');
      card.className = 'activity-item';
      card.dataset.leadId = item.leadId;

      card.innerHTML = `
        <div class="activity-icon-bubble">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="activity-content">
          <div class="activity-header">
            <span class="activity-lead-name">${escapeHtml(item.leadName)}</span>
            <span class="activity-time">${formatDate(item.createdAt)}</span>
          </div>
          <p class="activity-snippet">${escapeHtml(item.content)}</p>
        </div>
      `;

      card.addEventListener('click', () => {
        openLeadDrawer(item.leadId);
      });

      elements.analyticsActivityFeed.appendChild(card);
    });
  }

  // ==============================================================
  // LEAD CREATION & DETAIL DRAWER
  // ==============================================================

  function openCreateModal() {
    clearFormErrors();
    elements.createForm.reset();
    elements.createStatus.value = 'new';
    elements.createModal.classList.remove('hidden');
    setTimeout(() => elements.createName.focus(), 50);
  }

  function closeCreateModal() {
    elements.createModal.classList.add('hidden');
    clearFormErrors();
  }

  function clearFormErrors() {
    if (elements.errCreateName) elements.errCreateName.textContent = '';
    if (elements.errCreateEmail) elements.errCreateEmail.textContent = '';
    if (elements.errCreatePhone) elements.errCreatePhone.textContent = '';
  }

  async function handleCreateLead(e) {
    e.preventDefault();
    clearFormErrors();

    const name = elements.createName.value.trim();
    const email = elements.createEmail.value.trim();
    const phone = elements.createPhone.value.trim();
    const status = elements.createStatus.value;

    let hasError = false;
    if (!name) {
      elements.errCreateName.textContent = 'Name is required';
      hasError = true;
    }
    if (!email) {
      elements.errCreateEmail.textContent = 'Email is required';
      hasError = true;
    } else if (!isValidEmail(email)) {
      elements.errCreateEmail.textContent = 'Please enter a valid email format';
      hasError = true;
    }
    if (!phone) {
      elements.errCreatePhone.textContent = 'Phone number is required';
      hasError = true;
    }

    if (hasError) return;

    try {
      const res = await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, status })
      });

      const data = await res.json();

      if (res.status === 201 && data.success) {
        showToast(`Lead "${data.data.name}" created successfully!`);
        closeCreateModal();
        loadDashboard();
        if (state.currentView === 'analytics') {
          loadAnalytics(state.timeframe);
        }
      } else {
        if (data.details && Array.isArray(data.details)) {
          data.details.forEach(issue => {
            if (issue.field.includes('name')) elements.errCreateName.textContent = issue.message;
            if (issue.field.includes('email')) elements.errCreateEmail.textContent = issue.message;
            if (issue.field.includes('phone')) elements.errCreatePhone.textContent = issue.message;
          });
        } else {
          showToast(data.error || 'Failed to create lead', 'error');
        }
      }
    } catch (err) {
      console.error('Error creating lead:', err);
      showToast('Error creating lead', 'error');
    }
  }

  // Open Lead Drawer & Load Details + Notes
  async function openLeadDrawer(id) {
    try {
      const res = await fetch(`${API_BASE}/api/leads/${id}`);
      const json = await res.json();

      if (json.success && json.data) {
        state.currentLead = json.data;
        populateDrawer(json.data);
        elements.drawer.classList.remove('hidden');
      } else {
        showToast(json.error || 'Lead not found', 'error');
      }
    } catch (err) {
      console.error('Error fetching lead details:', err);
      showToast('Failed to load lead details', 'error');
    }
  }

  function closeDrawer() {
    elements.drawer.classList.add('hidden');
    state.currentLead = null;
  }

  function populateDrawer(lead) {
    elements.drawerLeadName.textContent = lead.name;
    elements.drawerLeadStatus.value = lead.status;
    elements.drawerStatusSaved.classList.add('hidden');
    elements.drawerLeadCreated.textContent = formatDate(lead.createdAt);
    elements.drawerLeadEmail.textContent = lead.email;
    elements.drawerLeadEmail.href = `mailto:${lead.email}`;
    elements.drawerLeadPhone.textContent = lead.phone;
    elements.drawerLeadPhone.href = `tel:${lead.phone}`;

    renderNotes(lead.notes || []);
  }

  function renderNotes(notes) {
    elements.notesTimeline.innerHTML = '';
    elements.notesCountBadge.textContent = `${notes.length} Note${notes.length === 1 ? '' : 's'}`;

    if (notes.length === 0) {
      elements.notesTimeline.innerHTML = `
        <div class="empty-notes">
          <p>No notes recorded yet. Add the first interaction note above!</p>
        </div>
      `;
      return;
    }

    notes.forEach((note) => {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.innerHTML = `
        <div class="note-top">
          <span class="note-author">Activity Note</span>
          <span class="note-timestamp">${formatDate(note.createdAt)}</span>
        </div>
        <p class="note-body">${escapeHtml(note.content)}</p>
      `;
      elements.notesTimeline.appendChild(card);
    });
  }

  // Update Status in Drawer
  async function handleStatusUpdate(e) {
    if (!state.currentLead) return;

    const newStatus = e.target.value;
    try {
      const res = await fetch(`${API_BASE}/api/leads/${state.currentLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const json = await res.json();
      if (json.success) {
        state.currentLead.status = newStatus;
        elements.drawerStatusSaved.classList.remove('hidden');
        setTimeout(() => elements.drawerStatusSaved.classList.add('hidden'), 2000);
        showToast(`Lead status updated to ${newStatus}`);
        loadDashboard();
        if (state.currentView === 'analytics') {
          loadAnalytics(state.timeframe);
        }
      } else {
        showToast(json.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Error updating lead status', 'error');
    }
  }

  // Add Note
  async function handleAddNote(e) {
    e.preventDefault();
    if (!state.currentLead) return;

    elements.errNoteContent.textContent = '';
    const content = elements.noteContentInput.value.trim();

    if (!content) {
      elements.errNoteContent.textContent = 'Note content cannot be empty';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/leads/${state.currentLead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      const json = await res.json();
      if (res.status === 201 && json.success) {
        elements.noteContentInput.value = '';
        showToast('Note posted successfully');
        
        // Refresh notes in drawer
        const detailRes = await fetch(`${API_BASE}/api/leads/${state.currentLead.id}`);
        const detailJson = await detailRes.json();
        if (detailJson.success && detailJson.data) {
          state.currentLead = detailJson.data;
          renderNotes(detailJson.data.notes || []);
        }

        // Refresh analytics if in view
        if (state.currentView === 'analytics') {
          loadAnalytics(state.timeframe);
        }
      } else {
        elements.errNoteContent.textContent = json.error || 'Failed to add note';
      }
    } catch (err) {
      console.error('Error adding note:', err);
      showToast('Failed to post note', 'error');
    }
  }

  // Delete Lead
  async function handleDeleteLead() {
    if (!state.currentLead) return;
    confirmAndDeleteLead(state.currentLead.id, state.currentLead.name);
  }

  async function confirmAndDeleteLead(id, name) {
    if (!confirm(`Are you sure you want to delete lead "${name}"? All associated notes will also be deleted.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/leads/${id}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (json.success) {
        showToast(`Lead "${name}" deleted`);
        closeDrawer();
        loadDashboard();
        if (state.currentView === 'analytics') {
          loadAnalytics(state.timeframe);
        }
      } else {
        showToast(json.error || 'Failed to delete lead', 'error');
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
      showToast('Error deleting lead', 'error');
    }
  }

  // Theme Toggle
  function toggleTheme() {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    if (state.analyticsData) {
      renderCharts(state.analyticsData);
    }
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    if (theme === 'light') {
      elements.sunIcon.classList.remove('hidden');
      elements.moonIcon.classList.add('hidden');
    } else {
      elements.sunIcon.classList.add('hidden');
      elements.moonIcon.classList.remove('hidden');
    }
  }

  // Toast System
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' 
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

    toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // Helpers
  function formatDate(isoStr) {
    if (!isoStr) return '—';
    const date = new Date(isoStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run on load
  document.addEventListener('DOMContentLoaded', init);
})();
