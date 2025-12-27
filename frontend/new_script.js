console.log('script.js loaded');

/* =========================
   AUTH
========================= */
async function isAuthenticated() {
  try {
    const res = await fetch('/auth/status', { credentials: 'same-origin' });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.authenticated;
  } catch {
    return false;
  }
}

/* =========================
   UI HELPERS
========================= */
function showLogin() {
  document.getElementById('login-screen')?.style.setProperty('display', 'block');
  document.getElementById('app-container')?.classList.add('hidden');
}

function showApp() {
  document.getElementById('login-screen')?.style.setProperty('display', 'none');
  document.getElementById('app-container')?.classList.remove('hidden');
}

function showStatus(message, type) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = message;
  el.className = type;
  setTimeout(() => {
    el.textContent = '';
    el.className = '';
  }, 3000);
}

/* =========================
   TENANT DATA
========================= */
let tenantData = {};

async function loadTenantData() {
  try {
    const res = await fetch('/api/tenants');
    if (res.ok) {
      const data = await res.json();
      tenantData = data.tenants || {};
      updateTenantDisplay();
    }
  } catch (e) {
    console.error('Load tenant error', e);
  }
}

async function saveTenantData() {
  try {
    const res = await fetch('/api/tenants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenants: tenantData })
    });
    return res.ok;
  } catch {
    return false;
  }
}

function updateTenantDisplay() {
  const floorSelect = document.getElementById('lantai');
  if (!floorSelect) return;

  floorSelect.innerHTML = '<option value="">-- Pilih Lantai --</option>';
  Object.keys(tenantData).sort().forEach(floor => {
    const opt = document.createElement('option');
    opt.value = floor;
    opt.textContent = `Lantai ${floor}`;
    floorSelect.appendChild(opt);
  });
}

function updateTenantDropdown(floor) {
  const tenantSelect = document.getElementById('tenantSelect');
  if (!tenantSelect) return;

  tenantSelect.innerHTML = '<option value="">-- Pilih Tenant --</option>';
  if (!tenantData[floor]) return;

  Object.entries(tenantData[floor]).forEach(([name, phone]) => {
    const opt = document.createElement('option');
    opt.value = phone;
    opt.textContent = name;
    tenantSelect.appendChild(opt);
  });
}

/* =========================
   FILE HELPER
========================= */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* =========================
   GOOGLE LOGIN
========================= */
function handleGoogleLogin() {
  const clientId = '110635673191-vtopt1540qjdbc1i2e23re7ip39of52i.apps.googleusercontent.com';
  const redirectUri = 'http://localhost:3030/auth/google/callback';

  const url =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    '?client_id=' + clientId +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&response_type=code' +
    '&scope=' + encodeURIComponent('openid email profile');

  window.location.href = url;
}

/* =========================
   DOM READY (PENTING)
========================= */
document.addEventListener('DOMContentLoaded', async () => {

  /* ---------- AUTH GATE ---------- */
  if (await isAuthenticated()) {
    showApp();
    await loadTenantData();
  } else {
    showLogin();
  }

  /* ---------- EVENTS ---------- */
  document.getElementById('googleLoginBtn')
    ?.addEventListener('click', handleGoogleLogin);

  document.getElementById('lantai')
    ?.addEventListener('change', e => updateTenantDropdown(e.target.value));

  document.getElementById('logoutBtn')
    ?.addEventListener('click', async () => {
      await fetch('/auth/logout', { method: 'POST' });
      showLogin();
    });

});
