
/* ============================================================================
   Panel status luring yang disuntikkan ke jendela aplikasi.

   Tujuannya satu: petugas klinik harus tahu, tanpa membuka menu apa pun,
   apakah datanya sudah terkirim ke server atau masih tertahan di perangkat.
   Panel ini hanya membaca status; ia tidak menyentuh rekam medis.
   ========================================================================== */

(function () {
  if (!window.simklinikDesktop || !window.simklinikDesktop.isDesktop) return;
  if (document.getElementById('simklinik-status-pill')) return;

  const pill = document.createElement('button');
  pill.id = 'simklinik-status-pill';
  pill.type = 'button';
  pill.style.cssText = [
    'position:fixed',
    'right:18px',
    'bottom:18px',
    'z-index:99999',
    'display:flex',
    'align-items:center',
    'gap:8px',
    'padding:9px 15px',
    'border-radius:999px',
    'border:1px solid rgba(20,22,26,.12)',
    'background:#fff',
    'color:#14161A',
    'font:600 12px/1.2 "Open Sans",system-ui,sans-serif',
    'box-shadow:0 8px 24px rgba(20,22,26,.16)',
    'cursor:pointer',
  ].join(';');

  const dot = document.createElement('span');
  dot.style.cssText = 'width:9px;height:9px;border-radius:50%;background:#9AA0A6;flex:0 0 auto';
  const label = document.createElement('span');
  label.textContent = 'Memeriksa status...';

  pill.appendChild(dot);
  pill.appendChild(label);
  document.body.appendChild(pill);

  let detailOpen = false;

  function paint(state) {
    const pending = state && state.db && state.db.pending;
    const last = state && state.db && state.db.lastSync;

    if (!state || !state.db || state.db.ready === false) {
      dot.style.background = '#9AA0A6';
      label.textContent = 'Basis data lokal tidak aktif';
      return;
    }

    if (pending > 0) {
      dot.style.background = '#E08B62';
      label.textContent = pending + ' entri menunggu sinkron';
    } else if (last && last.ok === false) {
      dot.style.background = '#D9534F';
      label.textContent = 'Gagal menghubungi server';
    } else {
      dot.style.background = '#3E9B63';
      label.textContent = 'Tersinkron';
    }

    if (detailOpen && state.db.counts) {
      const rows = Object.keys(state.db.counts)
        .map((k) => k + ': ' + (state.db.counts[k] === null ? '-' : state.db.counts[k]))
        .join('\n');
      pill.title =
        'Basis data: ' + state.db.path + '\n' + rows +
        '\nMenunggu sinkron: ' + pending +
        (last ? '\nSiklus terakhir: ' + (last.at || '-') + (last.ok ? ' (berhasil)' : ' (gagal)') : '');
    }
  }

  async function refresh() {
    try {
      const state = await window.simklinikDesktop.status();
      paint(state);
    } catch (e) {
      dot.style.background = '#D9534F';
      label.textContent = 'Status tidak terbaca';
    }
  }

  pill.addEventListener('click', async () => {
    detailOpen = !detailOpen;
    if (detailOpen) {
      await refresh();
      pill.title = pill.title || 'Menekan lagi untuk menyembunyikan rincian';
    } else {
      pill.title = '';
    }
    try {
      await window.simklinikDesktop.syncNow();
      refresh();
    } catch (e) {
      /* abaikan, status tetap ditampilkan apa adanya */
    }
  });

  refresh();
  setInterval(refresh, 20000);
})();
