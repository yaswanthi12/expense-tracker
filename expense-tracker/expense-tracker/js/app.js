/* =========================================================
   APP.JS
   Main application logic: state, rendering, event handlers.
   Depends on: storage.js (Storage), chart.js (ChartsModule)
   ========================================================= */

(() => {
  'use strict';

  // ---------------------------------------------------------
  // STATE
  // ---------------------------------------------------------
  let transactions = [];          // full list, loaded from Storage
  let currentFilters = { search: '', type: 'all', category: 'all', dateFrom: '', dateTo: '' };
  let sortState = { key: 'date', dir: 'desc' };
  let selectedType = 'income';    // for the add/edit modal type switch
  let editingId = null;           // null = add mode, otherwise editing this id
  let pendingDeleteId = null;

  const todayStr = () => new Date().toISOString().slice(0, 10);
  const currentMonthKey = () => new Date().toISOString().slice(0, 7); // "YYYY-MM"

  // ---------------------------------------------------------
  // DOM SHORTCUTS
  // ---------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ---------------------------------------------------------
  // FORMATTING HELPERS
  // ---------------------------------------------------------
  function formatCurrency(amount) {
    const n = Number(amount) || 0;
    const sign = n < 0 ? '-' : '';
    return `${sign}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDateDisplay(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function monthLabel(monthKey) {
    const [y, m] = monthKey.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  function categoryIcon(type, categoryName) {
    const list = Storage.CATEGORIES[type] || [];
    const found = list.find((c) => c.name === categoryName);
    return found ? found.icon : 'fa-tag';
  }

  function uid() {
    return 'txn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------------------------------------------------------
  // TOASTS
  // ---------------------------------------------------------
  function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 220);
    }, 2800);
  }

  // ---------------------------------------------------------
  // CATEGORY DROPDOWN POPULATION
  // ---------------------------------------------------------
  function populateCategorySelect(type) {
    const select = $('#txnCategory');
    select.innerHTML = '';
    Storage.CATEGORIES[type].forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  }

  function populateFilterCategoryOptions() {
    const select = $('#filterCategory');
    const current = select.value;
    const allCats = [...Storage.CATEGORIES.income, ...Storage.CATEGORIES.expense].map((c) => c.name);
    const unique = [...new Set(allCats)];
    select.innerHTML = '<option value="all">All Categories</option>' +
      unique.map((c) => `<option value="${c}">${c}</option>`).join('');
    select.value = current || 'all';
  }

  // ---------------------------------------------------------
  // DATA COMPUTATIONS
  // ---------------------------------------------------------
  function getTotals(list) {
    return list.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else acc.expense += t.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }

  function getMonthTransactions(monthKey) {
    return transactions.filter((t) => t.date.startsWith(monthKey));
  }

  function getCategoryTotals(list, type = 'expense') {
    const totals = {};
    list.filter((t) => t.type === type).forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return totals;
  }

  function getLastNMonths(n) {
    const months = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }
    return months;
  }

  // ---------------------------------------------------------
  // RENDER: DASHBOARD
  // ---------------------------------------------------------
  function renderDashboard() {
    const { income, expense } = getTotals(transactions);
    const balance = income - expense;

    $('#currentBalance').textContent = formatCurrency(balance);
    $('#heroIncome').textContent = formatCurrency(income);
    $('#heroExpense').textContent = formatCurrency(expense);
    $('#totalIncome').textContent = formatCurrency(income);
    $('#totalExpense').textContent = formatCurrency(expense);
    $('#txnCount').textContent = transactions.length;

    const balanceTrendEl = $('#balanceTrend');
    if (transactions.length === 0) {
      balanceTrendEl.textContent = 'Add your first transaction to get started';
    } else {
      balanceTrendEl.textContent = balance >= 0
        ? "You're in good shape — balance is positive"
        : 'Your expenses currently exceed your income';
    }

    // This month's savings
    const mKey = currentMonthKey();
    const monthTxns = getMonthTransactions(mKey);
    const monthTotals = getTotals(monthTxns);
    const monthSavings = monthTotals.income - monthTotals.expense;
    $('#monthSavings').textContent = formatCurrency(monthSavings);

    // Monthly summary panel
    $('#currentMonthLabel').textContent = monthLabel(mKey);
    $('#sumMonthIncome').textContent = formatCurrency(monthTotals.income);
    $('#sumMonthExpense').textContent = formatCurrency(monthTotals.expense);
    $('#sumMonthSavings').textContent = formatCurrency(monthSavings);
    $('#sumMonthCount').textContent = monthTxns.length;

    const monthCatTotals = getCategoryTotals(monthTxns, 'expense');
    const topCat = Object.entries(monthCatTotals).sort((a, b) => b[1] - a[1])[0];
    $('#sumTopCategory').textContent = topCat ? `${topCat[0]} (${formatCurrency(topCat[1])})` : '—';

    renderRecentTransactions();
  }

  function renderRecentTransactions() {
    const container = $('#recentTransactionsList');
    const recent = [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt)
      .slice(0, 6);

    if (recent.length === 0) {
      container.innerHTML = '<p class="empty-state">No transactions yet. Click "Add Transaction" to begin tracking.</p>';
      return;
    }

    container.innerHTML = recent.map((t) => `
      <div class="recent-item">
        <div class="recent-item__icon" style="background:${t.type === 'income' ? 'var(--income-soft)' : 'var(--expense-soft)'}; color:${t.type === 'income' ? 'var(--income)' : 'var(--expense)'};">
          <i class="fa-solid ${categoryIcon(t.type, t.category)}"></i>
        </div>
        <div class="recent-item__body">
          <div class="recent-item__title">${escapeHtml(t.title)}</div>
          <div class="recent-item__meta">${t.category} · ${formatDateDisplay(t.date)}</div>
        </div>
        <div class="recent-item__amount ${t.type === 'income' ? 'income-color' : 'expense-color'}">
          ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
        </div>
      </div>
    `).join('');
  }

  // ---------------------------------------------------------
  // RENDER: TRANSACTIONS TABLE
  // ---------------------------------------------------------
  function getFilteredSortedTransactions() {
    let list = [...transactions];
    const f = currentFilters;

    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    if (f.type !== 'all') list = list.filter((t) => t.type === f.type);
    if (f.category !== 'all') list = list.filter((t) => t.category === f.category);
    if (f.dateFrom) list = list.filter((t) => t.date >= f.dateFrom);
    if (f.dateTo) list = list.filter((t) => t.date <= f.dateTo);

    list.sort((a, b) => {
      let av = a[sortState.key];
      let bv = b[sortState.key];
      if (sortState.key === 'amount') { av = Number(av); bv = Number(bv); }
      if (av < bv) return sortState.dir === 'asc' ? -1 : 1;
      if (av > bv) return sortState.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  function renderTransactionsTable() {
    const tbody = $('#txnTableBody');
    const list = getFilteredSortedTransactions();
    const emptyState = $('#txnEmptyState');

    if (list.length === 0) {
      tbody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    tbody.innerHTML = list.map((t) => `
      <tr data-id="${t.id}">
        <td>${escapeHtml(t.title)}</td>
        <td><span class="cat-pill"><i class="fa-solid ${categoryIcon(t.type, t.category)}"></i> ${t.category}</span></td>
        <td>${formatDateDisplay(t.date)}</td>
        <td><span class="type-pill type-pill--${t.type}">${t.type}</span></td>
        <td class="amount-cell ${t.type === 'income' ? 'income-color' : 'expense-color'}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</td>
        <td>
          <div class="row-actions">
            <button class="edit-btn" data-id="${t.id}" aria-label="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="delete-btn" data-id="${t.id}" aria-label="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------------------------------------------
  // RENDER: CHARTS
  // ---------------------------------------------------------
  function renderAllCharts() {
    // Pie: expense distribution (all time)
    const expenseCatTotals = getCategoryTotals(transactions, 'expense');
    ChartsModule.renderPieChart(expenseCatTotals);

    // Bar: last 6 months income vs expense
    const months = getLastNMonths(6);
    const incomeData = months.map((m) => getTotals(getMonthTransactions(m)).income);
    const expenseData = months.map((m) => getTotals(getMonthTransactions(m)).expense);
    ChartsModule.renderBarChart(months.map(monthLabel).map(shortMonthLabel), incomeData, expenseData);

    // Line: spending trend — daily expense totals over last 30 days with data
    renderTrendLine();
  }

  function shortMonthLabel(full) {
    // "January 2026" -> "Jan '26"
    const [month, year] = full.split(' ');
    return `${month.slice(0, 3)} '${year.slice(2)}`;
  }

  function renderTrendLine() {
    const expenseTxns = transactions.filter((t) => t.type === 'expense');
    if (expenseTxns.length === 0) {
      ChartsModule.renderLineChart(['No data'], [0]);
      return;
    }
    // group by date, sum expenses
    const byDate = {};
    expenseTxns.forEach((t) => { byDate[t.date] = (byDate[t.date] || 0) + t.amount; });
    const sortedDates = Object.keys(byDate).sort();
    const labels = sortedDates.map((d) => formatDateDisplay(d).replace(/, \d{4}$/, ''));
    const data = sortedDates.map((d) => byDate[d]);
    ChartsModule.renderLineChart(labels, data);
  }

  // ---------------------------------------------------------
  // RENDER: BUDGET
  // ---------------------------------------------------------
  function renderBudget() {
    const mKey = currentMonthKey();
    $('#budgetMonthLabel').textContent = monthLabel(mKey);

    const budget = Storage.getBudgetForMonth(mKey);
    $('#budgetInput').value = budget || '';

    const monthExpense = getTotals(getMonthTransactions(mKey)).expense;
    $('#budgetSpentLabel').textContent = `${formatCurrency(monthExpense)} spent`;
    $('#budgetTotalLabel').textContent = `of ${formatCurrency(budget)}`;

    const fill = $('#budgetProgressFill');
    const alertBox = $('#budgetAlert');
    if (budget > 0) {
      const pct = Math.min((monthExpense / budget) * 100, 100);
      fill.style.width = pct + '%';
      fill.classList.remove('warn', 'over');
      if (monthExpense > budget) {
        fill.classList.add('over');
        alertBox.classList.remove('hidden');
        alertBox.querySelector('span').textContent =
          `You've exceeded your monthly budget by ${formatCurrency(monthExpense - budget)}.`;
      } else if (monthExpense / budget >= 0.8) {
        fill.classList.add('warn');
        alertBox.classList.remove('hidden');
        alertBox.querySelector('span').textContent =
          `Heads up — you've used ${Math.round((monthExpense / budget) * 100)}% of your budget.`;
      } else {
        alertBox.classList.add('hidden');
      }
    } else {
      fill.style.width = '0%';
      fill.classList.remove('warn', 'over');
      alertBox.classList.add('hidden');
    }

    renderQuickStats(mKey);
  }

  function renderQuickStats(mKey) {
    const monthTxns = getMonthTransactions(mKey);
    const expenseTxns = monthTxns.filter((t) => t.type === 'expense');
    const incomeTxns = monthTxns.filter((t) => t.type === 'income');

    // Avg daily spend
    const today = new Date();
    const daysSoFar = today.toISOString().slice(0, 7) === mKey ? today.getDate() : 30;
    const totalExpense = expenseTxns.reduce((s, t) => s + t.amount, 0);
    $('#qsAvgDaily').textContent = formatCurrency(totalExpense / Math.max(daysSoFar, 1));

    // Largest single expense
    const largest = [...expenseTxns].sort((a, b) => b.amount - a.amount)[0];
    $('#qsLargestExpense').textContent = largest ? `${largest.title} (${formatCurrency(largest.amount)})` : '—';

    // Most frequent category
    const freq = {};
    monthTxns.forEach((t) => { freq[t.category] = (freq[t.category] || 0) + 1; });
    const topFreq = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    $('#qsFrequentCategory').textContent = topFreq ? `${topFreq[0]} (${topFreq[1]}x)` : '—';

    // Income sources used (unique categories)
    const incomeSources = new Set(incomeTxns.map((t) => t.category));
    $('#qsIncomeSources').textContent = incomeSources.size;

    // Days tracked (unique dates with any transaction, all time)
    const uniqueDays = new Set(transactions.map((t) => t.date));
    $('#qsDaysTracked').textContent = uniqueDays.size;
  }

  // ---------------------------------------------------------
  // MASTER RENDER
  // ---------------------------------------------------------
  function renderAll() {
    renderDashboard();
    renderTransactionsTable();
    renderAllCharts();
    renderBudget();
  }

  // ---------------------------------------------------------
  // FORM VALIDATION
  // ---------------------------------------------------------
  function validateForm() {
    let valid = true;
    const title = $('#txnTitle').value.trim();
    const amount = parseFloat($('#txnAmount').value);
    const date = $('#txnDate').value;
    const category = $('#txnCategory').value;

    $('#errTitle').textContent = '';
    $('#errAmount').textContent = '';
    $('#errDate').textContent = '';
    $('#errCategory').textContent = '';

    if (!title) { $('#errTitle').textContent = 'Title is required.'; valid = false; }
    else if (title.length > 60) { $('#errTitle').textContent = 'Keep it under 60 characters.'; valid = false; }

    if (!amount || isNaN(amount) || amount <= 0) { $('#errAmount').textContent = 'Enter a valid amount greater than 0.'; valid = false; }

    if (!date) { $('#errDate').textContent = 'Date is required.'; valid = false; }
    else if (date > todayStr()) { $('#errDate').textContent = 'Date cannot be in the future.'; valid = false; }

    if (!category) { $('#errCategory').textContent = 'Please select a category.'; valid = false; }

    return valid;
  }

  // ---------------------------------------------------------
  // MODAL HANDLING
  // ---------------------------------------------------------
  function openAddModal() {
    editingId = null;
    $('#modalTitle').innerHTML = '<i class="fa-solid fa-plus"></i> Add Transaction';
    $('#submitTxnBtn').innerHTML = '<i class="fa-solid fa-check"></i> Save Transaction';
    $('#txnForm').reset();
    $('#txnId').value = '';
    $('#txnDate').value = todayStr();
    $('#txnDate').max = todayStr();
    setSelectedType('income');
    clearFormErrors();
    $('#modalOverlay').classList.add('open');
    setTimeout(() => $('#txnTitle').focus(), 80);
  }

  function openEditModal(id) {
    const txn = transactions.find((t) => t.id === id);
    if (!txn) return;
    editingId = id;
    $('#modalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Transaction';
    $('#submitTxnBtn').innerHTML = '<i class="fa-solid fa-check"></i> Update Transaction';
    setSelectedType(txn.type);
    $('#txnId').value = txn.id;
    $('#txnTitle').value = txn.title;
    $('#txnAmount').value = txn.amount;
    $('#txnDate').value = txn.date;
    $('#txnDate').max = todayStr();
    $('#txnCategory').value = txn.category;
    $('#txnNote').value = txn.note || '';
    clearFormErrors();
    $('#modalOverlay').classList.add('open');
  }

  function closeModal() {
    $('#modalOverlay').classList.remove('open');
    editingId = null;
  }

  function clearFormErrors() {
    ['#errTitle', '#errAmount', '#errDate', '#errCategory'].forEach((sel) => { $(sel).textContent = ''; });
  }

  function setSelectedType(type) {
    selectedType = type;
    $$('.type-switch__btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.type === type));
    populateCategorySelect(type);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const title = $('#txnTitle').value.trim();
    const amount = parseFloat($('#txnAmount').value);
    const date = $('#txnDate').value;
    const category = $('#txnCategory').value;
    const note = $('#txnNote').value.trim();

    if (editingId) {
      transactions = Storage.updateTransaction(editingId, { title, amount, date, category, note, type: selectedType });
      showToast('Transaction updated successfully', 'success');
    } else {
      const newTxn = {
        id: uid(),
        title, amount, date, category, note,
        type: selectedType,
        createdAt: Date.now(),
      };
      transactions = Storage.addTransaction(newTxn);
      showToast('Transaction added successfully', 'success');
    }

    closeModal();
    renderAll();
  }

  // ---------------------------------------------------------
  // DELETE HANDLING
  // ---------------------------------------------------------
  function openDeleteModal(id) {
    pendingDeleteId = id;
    $('#deleteModalOverlay').classList.add('open');
  }
  function closeDeleteModal() {
    $('#deleteModalOverlay').classList.remove('open');
    pendingDeleteId = null;
  }
  function confirmDelete() {
    if (pendingDeleteId) {
      transactions = Storage.deleteTransaction(pendingDeleteId);
      showToast('Transaction deleted', 'success');
      renderAll();
    }
    closeDeleteModal();
  }

  // ---------------------------------------------------------
  // NAVIGATION (section switching)
  // ---------------------------------------------------------
  function switchSection(sectionId) {
    $$('.section').forEach((s) => s.classList.toggle('active', s.id === sectionId));
    $$('.nav-link').forEach((l) => l.classList.toggle('active', l.dataset.section === sectionId));
    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openSidebar() {
    $('#sidebar').classList.add('open');
    $('#sidebarOverlay').classList.add('open');
  }
  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#sidebarOverlay').classList.remove('open');
  }

  // ---------------------------------------------------------
  // THEME
  // ---------------------------------------------------------
  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    Storage.setTheme(theme);
    const icon = theme === 'dark' ? 'fa-moon' : 'fa-sun';
    $('#themeToggle').querySelector('i').className = `fa-solid ${icon}`;
    $('#themeToggle').querySelector('span:nth-child(2)').textContent = theme === 'dark' ? 'Dark mode' : 'Light mode';
    $('#themeToggleMobile').querySelector('i').className = `fa-solid ${icon}`;
    // Re-render charts so their colors/gridlines match the new theme
    ChartsModule.refreshTheme();
    renderAllCharts();
  }

  function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  // ---------------------------------------------------------
  // EXPORT: CSV
  // ---------------------------------------------------------
  function exportToCSV() {
    if (transactions.length === 0) {
      showToast('No transactions to export', 'error');
      return;
    }
    const headers = ['Title', 'Category', 'Date', 'Type', 'Amount', 'Note'];
    const rows = transactions.map((t) => [
      csvEscape(t.title), csvEscape(t.category), t.date, t.type, t.amount.toFixed(2), csvEscape(t.note || ''),
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadFile(csvContent, `expense-tracker-transactions-${todayStr()}.csv`, 'text/csv');
    showToast('Transactions exported as CSV', 'success');
  }

  function csvEscape(value) {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------
  // EXPORT: MONTHLY REPORT (plain text)
  // ---------------------------------------------------------
  function exportMonthlyReport() {
    const mKey = currentMonthKey();
    const monthTxns = getMonthTransactions(mKey);
    if (monthTxns.length === 0) {
      showToast('No transactions this month to report', 'error');
      return;
    }
    const totals = getTotals(monthTxns);
    const savings = totals.income - totals.expense;
    const catTotals = getCategoryTotals(monthTxns, 'expense');
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    const budget = Storage.getBudgetForMonth(mKey);

    let report = '';
    report += `SMART EXPENSE TRACKER — MONTHLY REPORT\n`;
    report += `Month: ${monthLabel(mKey)}\n`;
    report += `Generated: ${new Date().toLocaleString('en-IN')}\n`;
    report += `${'='.repeat(50)}\n\n`;
    report += `SUMMARY\n`;
    report += `-`.repeat(50) + '\n';
    report += `Total Income:        ${formatCurrency(totals.income)}\n`;
    report += `Total Expenses:      ${formatCurrency(totals.expense)}\n`;
    report += `Net Savings:         ${formatCurrency(savings)}\n`;
    report += `Budget Set:          ${budget ? formatCurrency(budget) : 'Not set'}\n`;
    report += `Highest Category:    ${topCat ? `${topCat[0]} (${formatCurrency(topCat[1])})` : '—'}\n`;
    report += `Total Transactions:  ${monthTxns.length}\n\n`;

    report += `EXPENSE BREAKDOWN BY CATEGORY\n`;
    report += `-`.repeat(50) + '\n';
    Object.entries(catTotals).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
      report += `${cat.padEnd(20)} ${formatCurrency(amt)}\n`;
    });

    report += `\nTRANSACTION LIST\n`;
    report += `-`.repeat(50) + '\n';
    [...monthTxns].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((t) => {
      report += `${t.date}  ${t.type === 'income' ? '[+]' : '[-]'}  ${t.title.padEnd(25)} ${t.category.padEnd(15)} ${formatCurrency(t.amount)}\n`;
    });

    downloadFile(report, `expense-report-${mKey}.txt`, 'text/plain');
    showToast('Monthly report generated', 'success');
  }

  // ---------------------------------------------------------
  // EVENT BINDING
  // ---------------------------------------------------------
  function bindEvents() {
    // Sidebar navigation
    $$('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection(link.dataset.section);
      });
    });

    $('#sidebarToggle').addEventListener('click', openSidebar);
    $('#sidebarClose').addEventListener('click', closeSidebar);
    $('#sidebarOverlay').addEventListener('click', closeSidebar);

    // Theme toggles
    $('#themeToggle').addEventListener('click', toggleTheme);
    $('#themeToggleMobile').addEventListener('click', toggleTheme);

    // Add transaction modal triggers
    $('#openAddModalBtn').addEventListener('click', openAddModal);
    $$('[data-open-modal]').forEach((btn) => btn.addEventListener('click', openAddModal));
    $('#closeModalBtn').addEventListener('click', closeModal);
    $('#cancelModalBtn').addEventListener('click', closeModal);
    $('#modalOverlay').addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') closeModal(); });

    // Type switch buttons
    $$('.type-switch__btn').forEach((btn) => {
      btn.addEventListener('click', () => setSelectedType(btn.dataset.type));
    });

    // Form submit
    $('#txnForm').addEventListener('submit', handleFormSubmit);

    // Table row actions (event delegation)
    $('#txnTableBody').addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-btn');
      const deleteBtn = e.target.closest('.delete-btn');
      if (editBtn) openEditModal(editBtn.dataset.id);
      if (deleteBtn) openDeleteModal(deleteBtn.dataset.id);
    });

    // Delete modal
    $('#closeDeleteModalBtn').addEventListener('click', closeDeleteModal);
    $('#cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    $('#confirmDeleteBtn').addEventListener('click', confirmDelete);
    $('#deleteModalOverlay').addEventListener('click', (e) => { if (e.target.id === 'deleteModalOverlay') closeDeleteModal(); });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeModal(); closeDeleteModal(); }
    });

    // Filters
    $('#searchInput').addEventListener('input', (e) => { currentFilters.search = e.target.value; renderTransactionsTable(); });
    $('#filterType').addEventListener('change', (e) => { currentFilters.type = e.target.value; renderTransactionsTable(); });
    $('#filterCategory').addEventListener('change', (e) => { currentFilters.category = e.target.value; renderTransactionsTable(); });
    $('#filterDateFrom').addEventListener('change', (e) => { currentFilters.dateFrom = e.target.value; renderTransactionsTable(); });
    $('#filterDateTo').addEventListener('change', (e) => { currentFilters.dateTo = e.target.value; renderTransactionsTable(); });
    $('#clearFiltersBtn').addEventListener('click', () => {
      currentFilters = { search: '', type: 'all', category: 'all', dateFrom: '', dateTo: '' };
      $('#searchInput').value = '';
      $('#filterType').value = 'all';
      $('#filterCategory').value = 'all';
      $('#filterDateFrom').value = '';
      $('#filterDateTo').value = '';
      renderTransactionsTable();
    });

    // Table sorting
    $$('.txn-table thead th[data-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (sortState.key === key) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        else { sortState.key = key; sortState.dir = 'asc'; }
        renderTransactionsTable();
      });
    });

    // Export buttons
    $('#exportCsvBtn').addEventListener('click', exportToCSV);
    $('#exportReportBtn').addEventListener('click', exportMonthlyReport);

    // Budget form
    $('#budgetForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat($('#budgetInput').value);
      if (isNaN(amount) || amount < 0) { showToast('Enter a valid budget amount', 'error'); return; }
      Storage.setBudgetForMonth(currentMonthKey(), amount);
      showToast('Budget saved for this month', 'success');
      renderBudget();
    });
  }

  // ---------------------------------------------------------
  // INIT
  // ---------------------------------------------------------
  function init() {
    transactions = Storage.getTransactions();
    applyTheme(Storage.getTheme());
    populateCategorySelect(selectedType);
    populateFilterCategoryOptions();
    bindEvents();
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
