
/* ============================================================================
   SIMKLINIK Desktop - proses utama Electron
   Menjalankan server Next.js lokal + jendela aplikasi + basis data SQLite.
   Dirancang agar klinik tetap bisa bekerja saat internet mati.
   ========================================================================== */

const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');

const isDev = !app.isPackaged;
const PORT = Number(process.env.SIMKLINIK_PORT || 4321);

let mainWindow = null;
let nextServer = null;
let localDb = null;
let syncTimer = null;
let lastSync = null;

const SUPABASE_URL = process.env.SIMKLINIK_SUPABASE_URL || 'https://fawmudsaaotlqyryciwd.supabase.co';
const SUPABASE_KEY = process.env.SIMKLINIK_SUPABASE_KEY || 'sb_publishable_wRGUQNJKi5XUjMXHFpDxVw_hPAPyhUc';
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Lokasi penyimpanan data lokal (bertahan antar pembaruan aplikasi)           */
/* -------------------------------------------------------------------------- */

function userDataDir() {
  return app.getPath('userData');
}

function ensureDirs() {
  for (const d of [
    userDataDir(),
    path.join(userDataDir(), 'data'),
    path.join(userDataDir(), 'logs'),
    path.join(userDataDir(), 'backup'),
  ]) {
    fs.mkdirSync(d, { recursive: true });
  }
  process.env.SIMKLINIK_DB_PATH = path.join(userDataDir(), 'data', 'simklinik.sqlite');
  process.env.SIMKLINIK_DATA_DIR = path.join(userDataDir(), 'data');
  process.env.SIMKLINIK_DESKTOP = '1';
}

/* -------------------------------------------------------------------------- */
/* Basis data lokal                                                           */
/* -------------------------------------------------------------------------- */

function openLocalDb() {
  const Database = require('better-sqlite3');
  const dbPath = process.env.SIMKLINIK_DB_PATH;
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = isDev
    ? path.join(__dirname, '..', 'db', 'schema.sql')
    : path.join(process.resourcesPath, 'db', 'schema.sql');

  if (fs.existsSync(schemaPath)) {
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
  } else {
    console.warn('[simklinik] berkas skema tidak ditemukan:', schemaPath);
  }

  return db;
}

/** Snapshot ringkas untuk panel status di aplikasi. */
function dbStats() {
  if (!localDb) return { ready: false };
  const tables = ['patients', 'appointments', 'soap_sessions', 'billing_invoices', 'service_tariffs'];
  const counts = {};
  for (const t of tables) {
    try {
      counts[t] = localDb.prepare('SELECT COUNT(*) AS n FROM ' + t).get().n;
    } catch {
      counts[t] = null;
    }
  }
  let pending = 0;
  try {
    pending = localDb.prepare('SELECT COUNT(*) AS n FROM sync_queue WHERE synced_at IS NULL').get().n;
  } catch {
    pending = -1;
  }
  return {
    ready: true,
    path: process.env.SIMKLINIK_DB_PATH,
    counts,
    pending,
    lastSync,
  };
}

/* -------------------------------------------------------------------------- */
/* Siklus sinkronisasi berkala                                                */
/* -------------------------------------------------------------------------- */

function runSync() {
  if (!localDb) return Promise.resolve({ ok: false, reason: 'Basis data lokal tidak terbuka.' });
  try {
    const { syncCycle } = require(path.join(__dirname, '..', 'lib', 'sync.js'));
    return syncCycle(localDb, { url: SUPABASE_URL, key: SUPABASE_KEY })
      .then((res) => {
        lastSync = res;
        return res;
      })
      .catch((e) => {
        lastSync = { ok: false, error: String(e.message || e), at: new Date().toISOString() };
        return lastSync;
      });
  } catch (e) {
    lastSync = { ok: false, error: String(e.message || e), at: new Date().toISOString() };
    return Promise.resolve(lastSync);
  }
}

function startSyncLoop() {
  if (syncTimer) clearInterval(syncTimer);
  setTimeout(() => { runSync(); }, 4000);
  syncTimer = setInterval(() => { runSync(); }, SYNC_INTERVAL_MS);
}

/* -------------------------------------------------------------------------- */
/* Server Next.js lokal                                                       */
/* -------------------------------------------------------------------------- */

function startNextServer() {
  const appDir = isDev
    ? path.join(__dirname, '..', '..', 'terapi-wicara-web')
    : path.join(process.resourcesPath, 'web');

  const serverFile = isDev
    ? path.join(appDir, 'node_modules', 'next', 'dist', 'server', 'next.js')
    : path.join(appDir, 'server.js');

  if (!fs.existsSync(serverFile)) {
    throw new Error(
      'Berkas server tidak ditemukan: ' + serverFile + '\n' +
      'Jalankan build web lebih dahulu (npm run dist:win sudah termasuk).'
    );
  }

  if (isDev) {
    const next = require(serverFile);
    const nextApp = next({ dev: false, dir: appDir, hostname: '127.0.0.1', port: PORT });
    return nextApp.prepare().then(() => {
      nextServer = http.createServer((req, res) => nextApp.getRequestHandler()(req, res));
      return new Promise((resolve, reject) => {
        nextServer.once('error', reject);
        nextServer.listen(PORT, '127.0.0.1', () => resolve('http://127.0.0.1:' + PORT));
      });
    });
  }

  process.env.PORT = String(PORT);
  process.env.HOSTNAME = '127.0.0.1';
  require(serverFile);
  return waitForHealth(PORT, 30000).then(() => 'http://127.0.0.1:' + PORT);
}

function waitForHealth(port, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/api/health', timeout: 1500 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error('Server lokal tidak siap dalam batas waktu.'));
          return;
        }
        setTimeout(attempt, 400);
      });
      req.on('timeout', () => req.destroy());
    };
    attempt();
  });
}

/* -------------------------------------------------------------------------- */
/* Jendela                                                                    */
/* -------------------------------------------------------------------------- */

function createWindow(baseUrl) {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: '#FFFFFF',
    title: 'SIMKLINIK & RME - WicaraSehat',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.once(''ready-to-show'', () => mainWindow.show());

  // Panel status luring: petugas harus tahu kapan data belum terkirim.
  mainWindow.webContents.on(''did-finish-load'', () => {
    const panel = isDev
      ? path.join(__dirname, ''..'', ''renderer'', ''status-panel.js'')
      : path.join(process.resourcesPath, ''renderer'', ''status-panel.js'');
    if (fs.existsSync(panel)) {
      mainWindow.webContents.executeJavaScript(fs.readFileSync(panel, ''utf8'')).catch(() => {});
    }
  });
  mainWindow.loadURL(baseUrl + '/simklinik');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* -------------------------------------------------------------------------- */
/* Menu aplikasi (Bahasa Indonesia)                                           */
/* -------------------------------------------------------------------------- */

function buildMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Berkas',
        submenu: [
          {
            label: 'Buat Cadangan Basis Data',
            click: async () => {
              const dbPath = process.env.SIMKLINIK_DB_PATH;
              const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
              const dest = path.join(userDataDir(), 'backup', 'simklinik-' + stamp + '.sqlite');
              try {
                if (localDb) localDb.pragma('wal_checkpoint(TRUNCATE)');
                fs.copyFileSync(dbPath, dest);
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Cadangan dibuat',
                  message: 'Cadangan basis data tersimpan di:',
                  detail: dest,
                });
              } catch (e) {
                dialog.showErrorBox('Gagal mencadangkan', String(e.message || e));
              }
            },
          },
          { type: 'separator' },
          { role: 'quit', label: 'Keluar' },
        ],
      },
      {
        label: 'Tampilan',
        submenu: [
          { role: 'reload', label: 'Muat Ulang' },
          { role: 'toggleDevTools', label: 'Alat Pengembang' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Ukuran Normal' },
          { role: 'zoomIn', label: 'Perbesar' },
          { role: 'zoomOut', label: 'Perkecil' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Layar Penuh' },
        ],
      },
      {
        label: 'Bantuan',
        submenu: [
          { label: 'Buka Folder Data', click: () => shell.openPath(path.join(userDataDir(), 'data')) },
          { label: 'Buka Folder Cadangan', click: () => shell.openPath(path.join(userDataDir(), 'backup')) },
          {
            label: 'Tentang SIMKLINIK',
            click: () =>
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Tentang',
                message: 'SIMKLINIK & RME - WicaraSehat',
                detail:
                  'Aplikasi desktop untuk klinik terapi wicara.\n' +
                  'Rekam medis tersimpan lokal (SQLite) dan tersinkron ke server klinik.\n' +
                  'Patuh Permenkes 24/2022, Permenkes 34/2022, UU 17/2023 & UU PDP 27/2022.\n' +
                  'Versi ' + app.getVersion(),
              }),
          },
        ],
      },
    ])
  );
}

/* -------------------------------------------------------------------------- */
/* Jembatan IPC untuk preload                                                 */
/* -------------------------------------------------------------------------- */

ipcMain.handle('simklinik:status', () => ({
  ok: true,
  app: 'SIMKLINIK Desktop',
  version: app.getVersion(),
  time: new Date().toISOString(),
  db: dbStats(),
}));

ipcMain.handle('simklinik:sync-now', () => runSync());

// Lapisan tulis lokal: setiap penyimpanan WAJIB lewat sini agar masuk antrean.
ipcMain.handle('simklinik:local-save', (event, args) => {
  if (!localDb) return { ok: false, error: 'Basis data lokal tidak aktif.' };
  const { saveLocal } = require(path.join(__dirname, '..', 'lib', 'localStore.js'));
  return saveLocal(localDb, args);
});

ipcMain.handle('simklinik:local-delete', (event, args) => {
  if (!localDb) return { ok: false, error: 'Basis data lokal tidak aktif.' };
  const { deleteLocal } = require(path.join(__dirname, '..', 'lib', 'localStore.js'));
  return deleteLocal(localDb, args);
});

ipcMain.handle('simklinik:backup', () => {
  const dbPath = process.env.SIMKLINIK_DB_PATH;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const dest = path.join(userDataDir(), 'backup', 'simklinik-' + stamp + '.sqlite');
  if (localDb) localDb.pragma('wal_checkpoint(TRUNCATE)');
  fs.copyFileSync(dbPath, dest);
  return { ok: true, path: dest };
});

/* -------------------------------------------------------------------------- */
/* Siklus hidup                                                               */
/* -------------------------------------------------------------------------- */

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    ensureDirs();
    buildMenu();
    try {
      localDb = openLocalDb();
    } catch (e) {
      dialog.showErrorBox(
        'Basis data lokal gagal dibuka',
        String(e.message || e) + '\n\nAplikasi tetap dapat dijalankan, namun data tidak tersimpan lokal.'
      );
      localDb = null;
    }
    if (localDb) startSyncLoop();
    try {
      const baseUrl = await startNextServer();
      createWindow(baseUrl);
    } catch (err) {
      dialog.showErrorBox('Gagal memulai SIMKLINIK', String(err.message || err));
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (syncTimer) clearInterval(syncTimer);
    if (nextServer) nextServer.close();
    if (localDb) {
      try {
        localDb.close();
      } catch {
        /* abaikan */
      }
    }
    if (process.platform !== 'darwin') app.quit();
  });
}
