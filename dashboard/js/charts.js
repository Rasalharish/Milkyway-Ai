/**
 * charts.js — Chart.js chart initialisation and update for Milkyway AI
 */

/* ── Chart defaults ─────────────────────────────────────────────────────── */
Chart.defaults.color = '#8b95b0';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

const ACCENT  = '#00e8a0';
const BLUE    = '#4f9eff';
const AMBER   = '#f59e0b';
const DANGER  = '#ef4444';

/* ── Live mini line chart ───────────────────────────────────────────────── */
let liveChart = null;
const LIVE_HISTORY = 150;
const liveData = Array(LIVE_HISTORY).fill(0);

function initLiveChart() {
  const ctx = document.getElementById('live-count-chart').getContext('2d');
  liveChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array(LIVE_HISTORY).fill(''),
      datasets: [{
        label: 'Bottles in Frame',
        data: liveData,
        borderColor: ACCENT,
        backgroundColor: 'rgba(0, 232, 160, 0.08)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: {
          min: 0,
          suggestedMax: 6,
          ticks: { stepSize: 2, font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
    },
  });
}

function pushLiveCount(count) {
  liveData.shift();
  liveData.push(count);
  if (liveChart) {
    liveChart.data.datasets[0].data = [...liveData];
    liveChart.update('none');
  }
}

/* ── Hourly chart ───────────────────────────────────────────────────────── */
let hourlyChart = null;

function initHourlyChart(labels, counts, peakCounts) {
  const ctx = document.getElementById('hourly-chart').getContext('2d');
  if (hourlyChart) hourlyChart.destroy();
  hourlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Bottles',
          data: counts,
          backgroundColor: 'rgba(0, 232, 160, 0.25)',
          borderColor: ACCENT,
          borderWidth: 1.5,
          borderRadius: 4,
        },
        {
          label: 'Peak per Frame',
          data: peakCounts,
          type: 'line',
          borderColor: BLUE,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.4,
          yAxisID: 'yPeak',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: '#8b95b0', boxWidth: 12 },
        },
        tooltip: {
          backgroundColor: '#151822',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { maxRotation: 45, font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          title: { display: true, text: 'Total Bottles', color: '#8b95b0', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        yPeak: {
          position: 'right',
          title: { display: true, text: 'Peak / Frame', color: BLUE, font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
  });
}

/* ── Shift doughnut chart ───────────────────────────────────────────────── */
let shiftChart = null;

function initShiftChart(morning, afternoon, night) {
  const ctx = document.getElementById('shift-chart').getContext('2d');
  if (shiftChart) shiftChart.destroy();
  shiftChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Morning (6–14)', 'Afternoon (14–22)', 'Night (22–6)'],
      datasets: [{
        data: [morning, afternoon, night],
        backgroundColor: [
          'rgba(0, 232, 160, 0.7)',
          'rgba(79, 158, 255, 0.7)',
          'rgba(245, 158, 11, 0.7)',
        ],
        borderColor: ['#00e8a0', '#4f9eff', '#f59e0b'],
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8b95b0', boxWidth: 12, font: { size: 11 } },
        },
        tooltip: {
          backgroundColor: '#151822',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
        },
      },
    },
  });
}

/* ── Inference perf line chart ──────────────────────────────────────────── */
let perfChart = null;

function initPerfChart(labels, msValues) {
  const ctx = document.getElementById('perf-chart').getContext('2d');
  if (perfChart) perfChart.destroy();
  perfChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Avg Inference (ms)',
        data: msValues,
        borderColor: AMBER,
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.4,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#151822',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { maxRotation: 45, font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          title: { display: true, text: 'ms', color: '#8b95b0', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
    },
  });
}
