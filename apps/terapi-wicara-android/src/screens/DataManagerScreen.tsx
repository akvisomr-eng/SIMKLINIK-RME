
/*
 * Modul Operasional Android — CRUD penuh ke basis data (bukan tampilan statis).
 * Setiap penambahan, perubahan, dan penghapusan memanggil RPC server
 * tw_crud_save / tw_crud_delete, lalu daftar dimuat ulang dari server.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Pencil, Plus, RefreshCw, Trash2, Wallet } from 'lucide-react-native';
import { PatientRecord, TherapistCredential } from '../types/clinical';
import {
  CrudRow,
  CrudTable,
  deleteRow,
  listRows,
  saveRow,
} from '../services/crudService';

type FieldType = 'text' | 'number' | 'date' | 'select' | 'patient';

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  defaultValue?: string;
}

interface ModuleDef {
  id: string;
  label: string;
  table: CrudTable;
  title: string;
  primary: string;
  secondary?: string;
  fields: FieldDef[];
}

const MODULES: ModuleDef[] = [
  {
    id: 'KASIR',
    label: 'Kasir',
    table: 'billing_invoices',
    title: 'Kasir & Pembayaran Sesi',
    primary: 'description',
    secondary: 'amount_idr',
    fields: [
      { key: 'patient_id', label: 'Pasien', type: 'patient', required: true },
      { key: 'description', label: 'Uraian Layanan', type: 'text', required: true },
      { key: 'amount_idr', label: 'Nominal (Rp)', type: 'number', required: true },
      {
        key: 'payment_method',
        label: 'Metode Bayar',
        type: 'select',
        options: ['QRIS', 'TRANSFER_VA', 'DEBIT_KREDIT', 'TUNAI', 'POTONG_PAKET', 'ASURANSI_KORPORAT'],
        defaultValue: 'QRIS',
      },
      { key: 'cashier_name', label: 'Nama Kasir', type: 'text', required: true },
    ],
  },
  {
    id: 'TARIF',
    label: 'Tarif',
    table: 'service_tariffs',
    title: 'Master Tarif Layanan',
    primary: 'service_name',
    secondary: 'unit_price_idr',
    fields: [
      { key: 'service_code', label: 'Kode Tarif', type: 'text', required: true },
      { key: 'service_name', label: 'Nama Layanan', type: 'text', required: true },
      {
        key: 'category',
        label: 'Kategori',
        type: 'select',
        options: [
          'ASESMEN_AWAL',
          'TERAPI_REGULER',
          'PAKET_SESI',
          'TERAPI_MENELAN_DISFAGIA',
          'EVALUASI_LAPORAN',
          'TELETERAPI',
          'HOME_VISIT',
        ],
        defaultValue: 'TERAPI_REGULER',
      },
      { key: 'icd9cm_code', label: 'Kode ICD-9-CM', type: 'text', defaultValue: '93.75' },
      { key: 'duration_minutes', label: 'Durasi (menit)', type: 'number', defaultValue: '45' },
      { key: 'sessions_included', label: 'Jumlah Sesi', type: 'number', defaultValue: '1' },
      { key: 'unit_price_idr', label: 'Harga (Rp)', type: 'number', required: true },
      { key: 'therapist_fee_idr', label: 'Jasa Terapis (Rp)', type: 'number', defaultValue: '0' },
    ],
  },
  {
    id: 'PAKET',
    label: 'Paket',
    table: 'patient_packages',
    title: 'Paket Sesi Pasien',
    primary: 'package_name',
    secondary: 'remaining_sessions',
    fields: [
      { key: 'patient_id', label: 'Pasien', type: 'patient', required: true },
      { key: 'package_name', label: 'Nama Paket', type: 'text', required: true },
      { key: 'total_sessions', label: 'Total Sesi', type: 'number', defaultValue: '10' },
      { key: 'used_sessions', label: 'Sesi Terpakai', type: 'number', defaultValue: '0' },
      { key: 'total_paid_idr', label: 'Nilai Dibayar (Rp)', type: 'number', required: true },
      { key: 'valid_until', label: 'Berlaku Sampai', type: 'date', required: true },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['AKTIF', 'HABIS', 'DIBEKUKAN', 'KEDALUWARSA'],
        defaultValue: 'AKTIF',
      },
    ],
  },
  {
    id: 'INM',
    label: 'Mutu INM',
    table: 'quality_indicators',
    title: 'Indikator Mutu Nasional (INM)',
    primary: 'indicator_name',
    secondary: 'achieved_percentage',
    fields: [
      { key: 'period_month', label: 'Periode (YYYY-MM)', type: 'text', required: true },
      { key: 'indicator_code', label: 'Kode INM', type: 'text', required: true },
      { key: 'indicator_name', label: 'Nama Indikator', type: 'text', required: true },
      {
        key: 'indicator_group',
        label: 'Kelompok',
        type: 'select',
        options: ['INM_KEMENKES', 'MUTU_PRIORITAS_TW', 'IKM_KEPUASAN'],
        defaultValue: 'INM_KEMENKES',
      },
      { key: 'numerator', label: 'Numerator', type: 'number', required: true },
      { key: 'denominator', label: 'Denominator', type: 'number', required: true },
      { key: 'target_percentage', label: 'Target (%)', type: 'number', defaultValue: '100' },
      { key: 'achieved_percentage', label: 'Capaian (%)', type: 'number', required: true },
    ],
  },
  {
    id: 'INVENTARIS',
    label: 'Alat',
    table: 'clinic_inventory',
    title: 'Inventaris & Alat Terapi',
    primary: 'item_name',
    secondary: 'stock_qty',
    fields: [
      { key: 'item_code', label: 'Kode Alat', type: 'text', required: true },
      { key: 'item_name', label: 'Nama Alat/Bahan', type: 'text', required: true },
      {
        key: 'category',
        label: 'Kategori',
        type: 'select',
        options: [
          'ALAT_TES_STANDAR',
          'ALAT_ORAL_MOTOR',
          'ALAT_UKUR_MEDIS',
          'MEDIA_EDUKASI_AAC',
          'BHP_MEDIS_PPI',
          'SARPRAS_KESELAMATAN',
        ],
        defaultValue: 'ALAT_ORAL_MOTOR',
      },
      { key: 'stock_qty', label: 'Jumlah Stok', type: 'number', defaultValue: '1' },
      { key: 'min_stock_alert', label: 'Batas Minimum', type: 'number', defaultValue: '1' },
      { key: 'unit', label: 'Satuan', type: 'text', defaultValue: 'unit' },
      {
        key: 'condition_status',
        label: 'Kondisi',
        type: 'select',
        options: ['BAIK_LAIK_PAKAI', 'PERLU_KALIBRASI', 'RUSAK_KARANTINA', 'STOK_MENIPIS'],
        defaultValue: 'BAIK_LAIK_PAKAI',
      },
      { key: 'room_location', label: 'Lokasi Ruang', type: 'text', defaultValue: 'Ruang Terapi 1' },
    ],
  },
  {
    id: 'SOP',
    label: 'SOP',
    table: 'sop_documents',
    title: 'Dokumen SOP Klinik',
    primary: 'title',
    secondary: 'sop_number',
    fields: [
      { key: 'sop_number', label: 'Nomor SOP', type: 'text', required: true },
      { key: 'title', label: 'Judul SOP', type: 'text', required: true },
      {
        key: 'category',
        label: 'Kategori',
        type: 'select',
        options: [
          'PELAYANAN_KLINIS',
          'PPI_STERILISASI',
          'KESELAMATAN_PASIEN',
          'KEGAWATDARURATAN',
          'RME_UU_PDP',
        ],
        defaultValue: 'PELAYANAN_KLINIS',
      },
      { key: 'regulation_reference', label: 'Dasar Regulasi', type: 'text', defaultValue: 'Permenkes 24/2022' },
      { key: 'effective_date', label: 'Tanggal Berlaku', type: 'date', required: true },
      { key: 'revision_number', label: 'Revisi Ke-', type: 'number', defaultValue: '1' },
      { key: 'approved_by', label: 'Disetujui Oleh', type: 'text', required: true },
    ],
  },
];

interface Props {
  therapist: TherapistCredential;
  patients: PatientRecord[];
  onDataChanged?: () => void;
}

export function DataManagerScreen({ therapist, patients, onDataChanged }: Props) {
  const [moduleId, setModuleId] = useState('KASIR');
  const [rows, setRows] = useState<CrudRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeModule: ModuleDef =
    MODULES.find((m) => m.id === moduleId) ?? MODULES[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRows(activeModule.table, 200);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeModule.table]);

  useEffect(() => {
    setFormOpen(false);
    setDraft({});
    load();
  }, [load]);

  const openForm = (existing?: CrudRow) => {
    const init: Record<string, string> = {};
    activeModule.fields.forEach((f) => {
      const current = existing ? existing[f.key] : undefined;
      init[f.key] =
        current !== undefined && current !== null && current !== ''
          ? String(current)
          : f.defaultValue ?? (f.type === 'date' ? new Date().toISOString().slice(0, 10) : '');
    });
    if (activeModule.table === 'billing_invoices' && !existing) {
      init.cashier_name = therapist.full_name;
    }
    setEditingId(existing ? String(existing.id) : null);
    setDraft(init);
    setFormOpen(true);
  };

  const numericKeys = activeModule.fields.filter((f) => f.type === 'number').map((f) => f.key);

  const submit = async () => {
    const missing = activeModule.fields.filter((f) => f.required && !String(draft[f.key] ?? '').trim());
    if (missing.length > 0) {
      Alert.alert('Belum lengkap', 'Isi dulu: ' + missing.map((m) => m.label).join(', '));
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editingId) payload.id = editingId;
      Object.entries(draft).forEach(([k, v]) => {
        if (v === undefined || v === '') return;
        payload[k] = numericKeys.includes(k) ? Number(v) : v;
      });

      if (activeModule.table === 'billing_invoices' && !editingId) {
        payload.payment_status = 'LUNAS';
        payload.issued_at = new Date().toISOString();
        payload.invoice_number =
          'INV/TW/' +
          new Date().toISOString().slice(0, 7).replace('-', '') +
          '/' +
          String(Date.now()).slice(-5);
      }
      if (activeModule.table === 'patient_packages') {
        const total = Number(draft.total_sessions ?? 0);
        const used = Number(draft.used_sessions ?? 0);
        payload.remaining_sessions = Math.max(total - used, 0);
        payload.recognized_revenue_idr = 0;
        payload.deferred_revenue_idr = Number(draft.total_paid_idr ?? 0);
      }
      if (activeModule.table === 'sop_documents') {
        payload.mandatory_checklist = '[]';
        payload.steps_summary = '{Dibuat dari aplikasi Android terapis}';
      }

      const res = await saveRow(
        activeModule.table,
        payload,
        therapist.full_name,
        'TERAPIS_WICARA',
        'ENTRI_ANDROID_' + activeModule.id
      );
      if (!res.ok) {
        Alert.alert('Gagal menyimpan', res.message);
        return;
      }
      setFormOpen(false);
      setDraft({});
      setEditingId(null);
      await load();
      onDataChanged?.();
    } catch (e) {
      Alert.alert('Gagal menyimpan', e instanceof Error ? e.message : 'Kesalahan tidak dikenal.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (row: CrudRow) => {
    Alert.alert(
      'Hapus rekaman?',
      'Rekaman akan dihapus dari basis data klinik dan tercatat di jejak audit.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteRow(
              activeModule.table,
              String(row.id),
              therapist.full_name,
              'HAPUS_ANDROID_' + activeModule.id
            );
            if (!res.ok) {
              Alert.alert('Gagal menghapus', res.message);
              return;
            }
            await load();
            onDataChanged?.();
          },
        },
      ]
    );
  };

  const labelFor = (f: FieldDef, value: string) => {
    if (f.type === 'patient') {
      const p = patients.find((x) => x.id === value);
      return p ? p.full_name : value;
    }
    return value;
  };

  return (
    <View style={styles.root}>
      <View style={styles.segmentWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MODULES.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setModuleId(m.id)}
              style={[styles.segment, moduleId === m.id && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, moduleId === m.id && styles.segmentTextActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headTitle}>{module.title}</Text>
          <Text style={styles.headSub}>Tersimpan di basis data klinik</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={load}>
          <RefreshCw size={15} color="#1E6B57" />
        </Pressable>
        <Pressable style={styles.addBtn} onPress={openForm}>
          <Plus size={14} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Tambah</Text>
        </Pressable>
      </View>

      {formOpen && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingId ? 'Ubah Rekaman' : 'Entri Baru'}
          </Text>
          {activeModule.fields.map((f) => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.fieldLabel}>
                {f.label}
                {f.required ? ' *' : ''}
              </Text>

              {f.type === 'select' ? (
                <View style={styles.chipRow}>
                  {(f.options ?? []).map((opt) => (
                    <Pressable
                      key={opt}
                      onPress={() => setDraft((d) => ({ ...d, [f.key]: opt }))}
                      style={[styles.chip, draft[f.key] === opt && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, draft[f.key] === opt && styles.chipTextActive]}>
                        {opt.replace(/_/g, ' ')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : f.type === 'patient' ? (
                <View style={styles.chipRow}>
                  {patients.slice(0, 8).map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => setDraft((d) => ({ ...d, patient_id: p.id }))}
                      style={[styles.chip, draft.patient_id === p.id && styles.chipActive]}
                    >
                      <Text
                        style={[styles.chipText, draft.patient_id === p.id && styles.chipTextActive]}
                      >
                        {p.full_name} · {p.medical_record_number}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <TextInput
                  value={draft[f.key] ?? ''}
                  onChangeText={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                  keyboardType={f.type === 'number' ? 'numeric' : 'default'}
                  placeholder={f.type === 'date' ? 'YYYY-MM-DD' : f.label}
                  placeholderTextColor="#9AAEB8"
                  style={styles.input}
                />
              )}
            </View>
          ))}

          <View style={styles.formActions}>
            <Pressable
              style={[styles.btnGhost]}
              onPress={() => {
                setFormOpen(false);
                setDraft({});
                setEditingId(null);
              }}
            >
              <Text style={styles.btnGhostText}>Batal</Text>
            </Pressable>
            <Pressable style={styles.btnPrimary} onPress={submit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  {editingId ? 'Simpan Perubahan' : 'Simpan ke Basis Data'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {loading && (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#1E6B57" />
            <Text style={styles.stateText}>Memuat dari basis data...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && rows.length === 0 && (
          <View style={styles.stateBox}>
            <Wallet size={22} color="#5A7285" />
            <Text style={styles.stateText}>
              Belum ada rekaman. Tekan "Tambah" untuk membuat entri pertama.
            </Text>
          </View>
        )}

        {!loading &&
          rows.map((row) => (
            <View key={String(row.id)} style={styles.rowCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {String(row[activeModule.primary] ?? '(tanpa judul)')}
                </Text>
                {activeModule.secondary && (
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {typeof row[activeModule.secondary] === 'number'
                      ? String(row[activeModule.secondary])
                      : labelFor(
                          activeModule.fields.find((f) => f.key === activeModule.secondary) ?? {
                            key: '',
                            label: '',
                            type: 'text',
                          },
                          String(row[activeModule.secondary] ?? '')
                        )}
                  </Text>
                )}
              </View>
              <Pressable style={styles.editBtn} onPress={() => openForm(row)}>
                <Pencil size={14} color="#1E6B57" />
              </Pressable>
              <Pressable style={styles.delBtn} onPress={() => remove(row)}>
                <Trash2 size={15} color="#8C2F22" />
              </Pressable>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F4EF', paddingHorizontal: 12, paddingTop: 10 },
  segmentWrap: { marginBottom: 10 },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E4E0D8',
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  segmentActive: { backgroundColor: '#103F35', borderColor: '#103F35' },
  segmentText: { fontSize: 11.5, fontWeight: '700', color: '#5A7285' },
  segmentTextActive: { color: '#FFFFFF' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  headTitle: { fontSize: 14, fontWeight: '800', color: '#0A1F2E' },
  headSub: { fontSize: 10.5, color: '#5A7285', marginTop: 1 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4E0D8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E6B57',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E0D8',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  formTitle: { fontSize: 12.5, fontWeight: '800', color: '#0A1F2E', marginBottom: 8 },
  field: { marginBottom: 9 },
  fieldLabel: { fontSize: 10.5, fontWeight: '800', color: '#5A7285', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#DCD7CD',
    backgroundColor: '#FCFBF8',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 12.5,
    color: '#0A1F2E',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCD7CD',
    backgroundColor: '#FCFBF8',
  },
  chipActive: { backgroundColor: '#DCEFE7', borderColor: '#2A8871' },
  chipText: { fontSize: 10.5, fontWeight: '700', color: '#5A7285' },
  chipTextActive: { color: '#103F35' },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E4E0D8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  btnGhostText: { fontSize: 12, fontWeight: '700', color: '#24435A' },
  btnPrimary: {
    flex: 2,
    backgroundColor: '#1E6B57',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  stateBox: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  stateText: { fontSize: 11.5, color: '#5A7285', textAlign: 'center', paddingHorizontal: 20 },
  errorBox: {
    backgroundColor: '#FBE9E7',
    borderColor: '#E8C4BE',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  errorText: { color: '#8C2F22', fontSize: 11.5, fontWeight: '600' },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E0D8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 7,
  },
  rowTitle: { fontSize: 12.5, fontWeight: '700', color: '#0A1F2E' },
  rowSub: { fontSize: 10.5, color: '#5A7285', marginTop: 2 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#DCEFE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#FBE9E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
