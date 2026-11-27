
/* ============================================================================
   Sinkronisasi dua arah SQLite <-> Supabase

   Arah turun : RPC tw_crud_list  -> upsert ke tabel lokal
   Arah naik  : baris lokal yang belum tersinkron -> RPC tw_crud_save

   Catatan penting:
   - Data SOAP dikirim lewat tw_android_submit_soap agar aturan TTE dan
     client_offline_uuid di server tetap berlaku (idempoten, aman diulang).
   - Baris dengan synced_at terisi dianggap sudah sama dengan server.
   - Bila jaringan gagal, antrean tidak dibuang: percobaan diulang pada siklus
     berikutnya dengan penambahan jumlah attempts dan pesan galat terakhir.
   ========================================================================== */

const TABLES = [
  'clinics',
  'therapists',
  'therapy_rooms',
  'patients',
  'appointments',
  'service_tariffs',
  'patient_packages',
  'billing_invoices',
  'quality_indicators',
  'soap_sessions',
];

function nowIso() {
  return new Date().toISOString();
}

async function rpc(url, key, fn, args) {
  const res = await fetch(url + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data && (data.message || data.hint || data.raw) ? data.message || data.raw : text;
    throw new Error('RPC ' + fn + ' gagal (' + res.status + '): ' + msg);
  }
  return data;
}

/* -------------------------------------------------------------------------- */
/* Turun: server -> lokal                                                     */
/* -------------------------------------------------------------------------- */

function pullTable(db, table, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  const sample = rows[0];

  // Kolom server LEBIH BANYAK daripada skema lokal. Tanpa penyaringan ini,
  // INSERT akan gagal dengan galat "no column named ...".
  const localCols = db
    .prepare('PRAGMA table_info(' + table + ')')
    .all()
    .map((r) => r.name);

  const cols = Object.keys(sample).filter((c) => c !== 'id' && localCols.includes(c));
  if (cols.length === 0) return 0;

  const insert = db.prepare(
    'INSERT INTO ' + table + ' (id, ' + cols.join(', ') + ', synced_at) ' +
      'VALUES (?, ' + cols.map(() => '?').join(', ') + ', ?) ' +
      'ON CONFLICT(id) DO UPDATE SET ' +
      cols.map((c) => c + ' = excluded.' + c).join(', ') +
      ', synced_at = excluded.synced_at'
  );

  let n = 0;
  const stamp = nowIso();
  const tx = db.transaction((items) => {
    for (const row of items) {
      const values = cols.map((c) => {
        const v = row[c];
        if (v === null || v === undefined) return null;
        if (typeof v === 'boolean') return v ? 1 : 0;
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      });
      insert.run(row.id, ...values, stamp);
      n += 1;
    }
  });
  tx(rows);
  return n;
}

async function pullAll(db, url, key, limit = 300) {
  const report = {};
  for (const table of TABLES) {
    try {
      const res = await rpc(url, key, 'tw_crud_list', { p_table: table, p_limit: limit });
      report[table] = pullTable(db, table, res && res.rows ? res.rows : []);
    } catch (e) {
      report[table] = 'gagal: ' + (e.message || e);
    }
  }
  db.prepare("INSERT INTO meta(key, value, updated_at) VALUES('last_pull', ?, ?) " +
    'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .run(nowIso(), nowIso());
  return report;
}

/* -------------------------------------------------------------------------- */
/* Naik: lokal -> server                                                      */
/* -------------------------------------------------------------------------- */

function enqueue(db, table, recordId, operation, payload) {
  db.prepare(
    'INSERT INTO sync_queue (table_name, record_id, operation, payload) VALUES (?, ?, ?, ?)'
  ).run(table, recordId, operation, JSON.stringify(payload || {}));
}

async function pushOne(url, key, item) {
  const payload = item.payload ? JSON.parse(item.payload) : {};

  if (item.operation === 'DELETE') {
    return rpc(url, key, 'tw_crud_delete', {
      p_table: item.table_name,
      p_id: item.record_id,
      p_actor_name: payload.actor_name || 'SIMKLINIK Desktop',
      p_reason: 'HAPUS_DESKTOP_OFFLINE',
    });
  }

  if (item.table_name === 'soap_sessions') {
    return rpc(url, key, 'tw_android_submit_soap', { p_payload: payload });
  }

  return rpc(url, key, 'tw_crud_save', {
    p_table: item.table_name,
    p_payload: payload,
    p_actor_name: payload.actor_name || 'SIMKLINIK Desktop',
    p_actor_role: 'TERAPIS_WICARA',
    p_reason: 'SINKRON_DESKTOP',
  });
}

async function pushAll(db, url, key, max = 50) {
  const items = db
    .prepare('SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY id LIMIT ?')
    .all(max);

  const report = { attempted: items.length, sent: 0, failed: 0, errors: [] };

  for (const item of items) {
    try {
      await pushOne(url, key, item);
      db.prepare('UPDATE sync_queue SET synced_at = ? WHERE id = ?').run(nowIso(), item.id);
      report.sent += 1;
    } catch (e) {
      report.failed += 1;
      report.errors.push(item.table_name + '/' + item.record_id + ': ' + (e.message || e));
      db.prepare('UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?').run(
        String(e.message || e).slice(0, 400),
        item.id
      );
    }
  }

  return report;
}

/* -------------------------------------------------------------------------- */
/* Siklus lengkap                                                             */
/* -------------------------------------------------------------------------- */

async function syncCycle(db, { url, key, limit = 300 }) {
  if (!url || !key) {
    return { ok: false, reason: 'Kredensial server belum diatur (SIMKLINIK_SUPABASE_URL / _KEY).' };
  }

  let up = null;
  let down = null;
  let error = null;

  try {
    up = await pushAll(db, url, key);
  } catch (e) {
    error = 'dorong: ' + (e.message || e);
  }

  try {
    down = await pullAll(db, url, key, limit);
  } catch (e) {
    error = (error ? error + ' | ' : '') + 'tarik: ' + (e.message || e);
  }

  const pending = db.prepare('SELECT COUNT(*) AS n FROM sync_queue WHERE synced_at IS NULL').get().n;

  return { ok: !error, error, up, down, pending, at: nowIso() };
}


module.exports = { syncCycle, pullAll, pushAll, enqueue, TABLES };
