
/* ============================================================================
   Lapisan tulis basis data lokal

   Inilah yang sebelumnya hilang: aplikasi desktop membaca SQLite tetapi tidak
   pernah mendaftarkan perubahan ke sync_queue, sehingga catatan yang dibuat
   saat internet mati tidak pernah terkirim ke server.

   Setiap operasi tulis WAJIB lewat modul ini, supaya baris ikut masuk antrean.
   Bila server sedang terjangkau, antrean langsung dikirim (flushSoon).
   ========================================================================== */

const ALLOWED = new Set([
  'patients',
  'appointments',
  'soap_sessions',
  'billing_invoices',
  'service_tariffs',
  'patient_packages',
  'quality_indicators',
]);

function nowIso() {
  return new Date().toISOString();
}

function assertTable(table) {
  if (!ALLOWED.has(table)) {
    throw new Error('Tabel tidak boleh ditulis dari desktop: ' + table);
  }
}

function localColumns(db, table) {
  return db
    .prepare('PRAGMA table_info(' + table + ')')
    .all()
    .map((r) => r.name);
}

function normalise(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

/* -------------------------------------------------------------------------- */
/* Antrean                                                                    */
/* -------------------------------------------------------------------------- */

function enqueue(db, table, recordId, operation, payload) {
  db.prepare(
    'INSERT INTO sync_queue (table_name, record_id, operation, payload) VALUES (?, ?, ?, ?)'
  ).run(table, recordId, operation, JSON.stringify(payload || {}));
}

function pendingCount(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM sync_queue WHERE synced_at IS NULL').get().n;
}

/* -------------------------------------------------------------------------- */
/* Tulis                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Simpan baris lokal lalu masukkan ke antrean.
 * payload tanpa `id` dianggap baris baru; `id` dibuat di sisi desktop agar
 * server dan lokal memakai kunci yang sama (idempoten, aman dikirim ulang).
 */
function saveLocal(db, { table, payload, actorName, localId }) {
  assertTable(table);

  const draft = Object.assign({}, payload);
  if (!draft.id) {
    draft.id = localId || require('node:crypto').randomUUID();
  }

  const cols = localColumns(db, table);
  const usable = Object.keys(draft).filter((c) => cols.includes(c));

  if (usable.length === 0) {
    throw new Error('Tidak ada kolom yang cocok untuk tabel ' + table);
  }

  const exists = db.prepare('SELECT 1 FROM ' + table + ' WHERE id = ?').get(draft.id);

  if (exists) {
    db.prepare(
      'UPDATE ' + table + ' SET ' +
        usable.filter((c) => c !== 'id').map((c) => c + ' = ?').join(', ') +
        ' WHERE id = ?'
    ).run(
      ...usable.filter((c) => c !== 'id').map((c) => normalise(draft[c])),
      draft.id
    );
  } else {
    db.prepare(
      'INSERT INTO ' + table + ' (' + usable.join(', ') + ') VALUES (' +
        usable.map(() => '?').join(', ') + ')'
    ).run(...usable.map((c) => normalise(draft[c])));
  }

  const outbound = Object.assign({}, payload, { id: draft.id });
  if (actorName) outbound.actor_name = actorName;

  enqueue(db, table, draft.id, exists ? 'UPDATE' : 'CREATE', outbound);

  return { id: draft.id, action: exists ? 'UPDATE' : 'CREATE', pending: pendingCount(db) };
}

/** Hapus baris lokal lalu antrekan penghapusan ke server. */
function deleteLocal(db, { table, id, actorName }) {
  assertTable(table);

  const exists = db.prepare('SELECT 1 FROM ' + table + ' WHERE id = ?').get(id);
  if (!exists) {
    throw new Error('Rekaman tidak ditemukan di basis data lokal.');
  }

  db.prepare('DELETE FROM ' + table + ' WHERE id = ?').run(id);
  enqueue(db, table, id, 'DELETE', { id, actor_name: actorName || 'SIMKLINIK Desktop' });

  return { id, action: 'DELETE', pending: pendingCount(db) };
}

module.exports = { saveLocal, deleteLocal, enqueue, pendingCount, ALLOWED_TABLES: ALLOWED };
