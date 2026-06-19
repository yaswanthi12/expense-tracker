/* =========================================================
   CHART.JS (app module — not the Chart.js library itself)
   Creates and updates the three analytics charts:
   1. Pie chart   — expense distribution by category
   2. Bar chart   — monthly income vs expenses
   3. Line chart  — spending trend over time
   Exposes a global `ChartsModule` used by app.js
   ========================================================= */

const ChartsModule = (() => {
  let pieChart = null;
  let barChart = null;
  let lineChart = null;

  // Distinct, accessible palette for category slices
  const PALETTE = [
    '#6366F1', '#34D399', '#F87171', '#FBBF24',
    '#818CF8', '#22D3EE', '#FB923C', '#A78BFA',
    '#F472B6', '#4ADE80',
  ];

  /** Reads current CSS variable values so charts match the active theme. */
  function themeColors() {
    const styles = getComputedStyle(document.body);
    return {
      text: styles.getPropertyValue('--text-secondary').trim() || '#94A3B8',
      grid: styles.getPropertyValue('--surface-border').trim() || 'rgba(255,255,255,0.08)',
      income: styles.getPropertyValue('--income').trim() || '#34D399',
      expense: styles.getPropertyValue('--expense').trim() || '#F87171',
      surface: styles.getPropertyValue('--surface-solid').trim() || '#131c2e',
    };
  }

  Chart.defaults.font.family = "'Inter', sans-serif";

  /** Builds/updates the expense-by-category pie chart. */
  function renderPieChart(categoryTotals) {
    const ctx = document.getElementById('categoryPieChart');
    if (!ctx) return;
    const colors = themeColors();
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    const emptyState = document.getElementById('pieEmptyState');
    if (labels.length === 0) {
      if (pieChart) { pieChart.destroy(); pieChart = null; }
      ctx.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    ctx.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    const config = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 3,
          borderColor: colors.surface,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: colors.text, usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: ₹${item.raw.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            },
          },
        },
      },
    };

    if (pieChart) {
      pieChart.data = config.data;
      pieChart.options = config.options;
      pieChart.update();
    } else {
      pieChart = new Chart(ctx, config);
    }
  }

  /** Builds/updates the monthly income vs expense bar chart. */
  function renderBarChart(monthLabels, incomeData, expenseData) {
    const ctx = document.getElementById('monthlyBarChart');
    if (!ctx) return;
    const colors = themeColors();

    const config = {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: colors.income,
            borderRadius: 6,
            maxBarThickness: 28,
          },
          {
            label: 'Expenses',
            data: expenseData,
            backgroundColor: colors.expense,
            borderRadius: 6,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: colors.text, usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 } } },
          tooltip: {
            callbacks: { label: (item) => ` ${item.dataset.label}: ₹${item.raw.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: colors.text, font: { size: 11.5 } } },
          y: {
            grid: { color: colors.grid },
            ticks: { color: colors.text, font: { size: 11.5 }, callback: (v) => '₹' + v.toLocaleString('en-IN') },
          },
        },
      },
    };

    if (barChart) {
      barChart.data = config.data;
      barChart.options = config.options;
      barChart.update();
    } else {
      barChart = new Chart(ctx, config);
    }
  }

  /** Builds/updates the spending-over-time line chart. */
  function renderLineChart(dateLabels, spendingData) {
    const ctx = document.getElementById('trendLineChart');
    if (!ctx) return;
    const colors = themeColors();

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(248,113,113,0.35)');
    gradient.addColorStop(1, 'rgba(248,113,113,0)');

    const config = {
      type: 'line',
      data: {
        labels: dateLabels,
        datasets: [{
          label: 'Spending',
          data: spendingData,
          borderColor: colors.expense,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: colors.expense,
          borderWidth: 2.5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (item) => ` ₹${item.raw.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: colors.text, font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
          y: {
            grid: { color: colors.grid },
            ticks: { color: colors.text, font: { size: 11.5 }, callback: (v) => '₹' + v.toLocaleString('en-IN') },
          },
        },
      },
    };

    if (lineChart) {
      lineChart.data = config.data;
      lineChart.options = config.options;
      lineChart.update();
    } else {
      lineChart = new Chart(ctx, config);
    }
  }

  /** Re-renders all charts using fresh theme colors (call on theme toggle). */
  function refreshTheme() {
    [pieChart, barChart, lineChart].forEach((c) => {
      if (c) c.destroy();
    });
    pieChart = null;
    barChart = null;
    lineChart = null;
  }

  return { renderPieChart, renderBarChart, renderLineChart, refreshTheme };
})();
