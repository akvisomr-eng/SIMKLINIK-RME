
'use client';

/**
 * Asisten konsultasi multi-agen — BERBEDA dari widget AI internal.
 *
 * Batas peran yang dijaga ketat:
 *  - Agen hanya memberi ANALISA SEMENTARA dan bahan bacaan.
 *  - Agen TIDAK menegakkan diagnosis, TIDAK meresepkan, TIDAK menyimpulkan
 *    perlu-tidaknya terapi. Keputusan klinis tetap milik terapis/dokter.
 *  - Setiap jawaban wajib menyertakan rujukan sumber dari basis pengetahuan.
 *  - Percakapan dicatat untuk perbaikan layanan, dengan persetujuan pengguna.
 */

import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Send, Sparkles, UserRound } from 'lucide-react';
import { getBrowserSupabase } from '../lib/supabaseClient';

const AGENTS = [
  { key: 'AGEN_ANALIS', label: 'Analisa awal', short: 'AN' },
  { key: 'AGEN_SUPERVISOR', label: 'Koordinasi', short: 'SP' },
  { key: 'AGEN_KEAMANAN', label: 'Kepatuhan data', short: 'KP' },
];

interface KbMatch {
  id: string;
  title: string;
  content: string;
  confidence: number;
  regulation_reference?: string | null;
}

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  cites?: KbMatch[];
}

function newToken() {
  return 'web-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function AiConsultAssistant() {
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const tokenRef = useRef<string>(newToken());

  const ask = useCallback(async () => {
    const question = input.trim();
    if (!question || busy) return;
    if (!consented) {
      setTurns((t) => [
        ...t,
        { role: 'user', text: question },
        {
          role: 'assistant',
          text: 'Mohon centang persetujuan pemrosesan data terlebih dahulu agar pertanyaan dapat diproses.',
        },
      ]);
      setInput('');
      return;
    }

    setTurns((t) => [...t, { role: 'user', text: question }]);
    setInput('');
    setBusy(true);

    try {
      const sb = getBrowserSupabase();
      if (!sb) {
        setTurns((t) => [
          ...t,
          {
            role: 'assistant',
            text: 'Layanan analisa sedang tidak dapat dijangkau. Silakan hubungi klinik melalui telepon.',
          },
        ]);
        return;
      }

      const started = Date.now();
      const { data, error } = await sb.rpc('tw_ai_kb_search', {
        p_query: question,
        p_limit: 2,
      });

      if (error) {
        setTurns((t) => [
          ...t,
          { role: 'assistant', text: 'Analisa gagal dimuat: ' + error.message },
        ]);
        return;
      }

      const matches: KbMatch[] = data?.matches ?? [];
      const responseMs = Date.now() - started;

      let reply: string;
      if (matches.length === 0) {
        reply =
          'Pertanyaan ini belum tercakup pada bahan bacaan kami. Petugas klinik akan membantu ' +
          'menjawabnya langsung — silakan gunakan formulir pendaftaran atau hubungi nomor klinik. ' +
          'Pertanyaan Anda kami catat sebagai bahan penyempurnaan, tanpa menyertakan identitas pribadi.';
      } else {
        const top = matches[0];
        reply =
          'Analisa sementara: ' +
          top.content +
          '\n\nCatatan: ini bahan informasi, bukan diagnosis dan bukan keputusan klinis. ' +
          'Penilaian akhir dilakukan terapis wicara atau dokter pada asesmen resmi.';
      }

      setTurns((t) => [
        ...t,
        { role: 'assistant', text: reply, cites: matches },
      ]);

      // Catat percakapan untuk evaluasi mutu layanan (tanpa identitas pasien).
      try {
        await sb.rpc('tw_ai_log_conversation', {
          p_session_token: tokenRef.current,
          p_role: 'PASIEN_WEB',
          p_message: question,
          p_cited: matches.map((m) => m.id),
          p_intent: 'KONSULTASI_PRA_KUNJUNGAN',
          p_confidence: matches[0]?.confidence ?? null,
          p_answer_source: matches.length ? 'BASIS_PENGETAHUAN_KLINIK' : 'TIDAK_DITEMUKAN',
          p_response_ms: responseMs,
          p_channel: 'WEBSITE_PUBLIK',
          p_page_context: 'KONSULTASI_ONLINE',
        });
      } catch {
        // pencatatan gagal tidak boleh menghalangi jawaban ke pengguna
      }

      if (matches.length === 0) {
        try {
          await sb.rpc('tw_ai_report_knowledge_gap', {
            p_question: question,
            p_intent: 'KONSULTASI_PRA_KUNJUNGAN',
          });
        } catch {
          // abaikan
        }
      }
    } finally {
      setBusy(false);
    }
  }, [busy, consented, input]);

  if (!open) {
    return (
      <button type="button" className="ew-btn ew-btn--grad" onClick={() => setOpen(true)}>
        <Sparkles size={15} /> Tanya asisten analisa
      </button>
    );
  }

  return (
    <div className="ew-ai">
      <div className="ew-ai-head">
        <Sparkles size={18} />
        <div style={{ flex: 1 }}>
          <b>Asisten analisa pra-kunjungan</b>
          <span>Analisa sementara dari tim agen — bukan keputusan klinis</span>
        </div>
      </div>

      <div className="ew-ai-body">
        <div className="ew-ai-disclaimer">
          <strong>Batas peran.</strong> Asisten ini hanya memberi analisa sementara dan bahan
          bacaan. Ia tidak menegakkan diagnosis, tidak meresepkan obat, dan tidak memutuskan perlu
          atau tidaknya terapi. Keputusan klinis sepenuhnya berada pada terapis wicara atau dokter
          yang memeriksa.
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {AGENTS.map((a) => (
            <span key={a.key} className="ew-agent-row">
              <span className="ew-agent-dot">{a.short}</span>
              {a.label}
            </span>
          ))}
        </div>

        {turns.length === 0 && (
          <p style={{ fontSize: 12, color: '#7A7A7A', lineHeight: 1.7 }}>
            Contoh pertanyaan: “Apa yang perlu dibawa saat asesmen pertama?”, “Berapa lama satu sesi
            terapi?”, “Bagaimana prosedur konsultasi online?”.
          </p>
        )}

        {turns.map((t, i) => (
          <div
            key={i}
            className={t.role === 'user' ? 'ew-ai-msg ew-ai-msg--user' : 'ew-ai-msg'}
          >
            <div className="ew-ai-bubble">
              {t.role === 'user' ? (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <UserRound size={12} /> {t.text}
                </span>
              ) : (
                t.text
              )}
            </div>
            {t.cites && t.cites.length > 0 && (
              <div className="ew-ai-source">
                Rujukan: {t.cites.map((c) => c.title).join(' · ')}
                {t.cites[0]?.regulation_reference ? ' — ' + t.cites[0].regulation_reference : ''}
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div className="ew-agent-row">
            <span className="ew-agent-dot">
              <Loader2 size={12} className="ew-spin" />
            </span>
            Menyusun analisa sementara...
          </div>
        )}

        <label className="ew-check">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
          />
          <span>
            Saya setuju pertanyaan saya diproses untuk keperluan analisa layanan, tanpa menyertakan
            data identitas pasien (UU PDP No. 27/2022).
          </span>
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            placeholder="Tulis pertanyaan Anda..."
            style={{
              flex: 1,
              fontFamily: 'inherit',
              fontSize: 13,
              padding: '11px 13px',
              borderRadius: 5,
              border: '1px solid #DEDEDE',
            }}
          />
          <button
            type="button"
            className="ew-btn ew-btn--grad"
            style={{ padding: '11px 16px' }}
            onClick={ask}
            disabled={busy || !input.trim()}
          >
            <Send size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 10.5, color: '#7A7A7A' }}>
          <AlertTriangle size={12} />
          Bila terjadi sesak napas, tersedak berat, atau penurunan kesadaran — segera hubungi layanan
          gawat darurat, bukan asisten ini.
        </div>
      </div>
    </div>
  );
}
