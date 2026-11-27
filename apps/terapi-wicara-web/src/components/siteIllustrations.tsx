
'use client';

/**
 * Ilustrasi halaman publik SIMKLINIK.
 *
 * Semua gambar dibuat sebagai SVG, bukan foto. Alasannya bukan sekadar teknis:
 * foto pasien anak adalah data pribadi spesifik menurut UU PDP 27/2022, dan
 * mengambil foto klinik orang lain dari internet lalu memasangnya di situs
 * resmi klinik adalah pelanggaran hak citra sekaligus menyesatkan pasien.
 * Ilustrasi orisinal menghilangkan kedua risiko itu.
 *
 * Palet mengikuti identitas EduWell: blush #DC8CDB dan peach #F6BF9F.
 */

import type { ReactNode } from 'react';

type FigureProps = {
  className?: string;
  /** Sembunyikan detail agar tetap terbaca di ukuran kartu kecil. */
  compact?: boolean;
};

const BLUSH = '#DC8CDB';
const PEACH = '#F6BF9F';
const DEEP = '#B25FB4';
const INK = '#14161A';
const SKIN = '#F3C9A8';
const SKIN_DARK = '#D9A882';

function Figure({
  children,
  className = 'ew-figure',
  label,
  tag,
  tagIcon,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  tag?: string;
  tagIcon?: ReactNode;
}) {
  return (
    <div className={className} role="img" aria-label={label}>
      {children}
      {tag ? (
        <span className="ew-figure-tag">
          {tagIcon}
          {tag}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Hero: terapis dan anak di meja terapi                                     */
/* -------------------------------------------------------------------------- */

export function HeroSessionFigure({ className }: FigureProps) {
  return (
    <Figure
      className={className ?? 'ew-figure'}
      label="Ilustrasi sesi terapi wicara: terapis mendampingi anak dengan kartu gambar dan cermin artikulasi"
      tag="Ruang kedap suara 32,5 dB"
    >
      <svg viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BLUSH} />
            <stop offset="100%" stopColor={PEACH} />
          </linearGradient>
          <linearGradient id="heroGlass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        <rect width="640" height="480" fill="url(#heroBg)" />
        <circle cx="520" cy="96" r="120" fill="#FFFFFF" opacity="0.16" />
        <circle cx="96" cy="404" r="150" fill="#FFFFFF" opacity="0.12" />

        {/* Jendela observasi orang tua */}
        <rect x="44" y="58" width="168" height="122" rx="12" fill="url(#heroGlass)" />
        <rect x="44" y="58" width="168" height="122" rx="12" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="3" />
        <line x1="128" y1="58" x2="128" y2="180" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="2" />

        {/* Rak kartu gambar */}
        <g opacity="0.9">
          <rect x="436" y="150" width="58" height="74" rx="8" fill="#FFFFFF" opacity="0.9" transform="rotate(-7 465 187)" />
          <rect x="470" y="158" width="58" height="74" rx="8" fill="#FFFFFF" opacity="0.75" transform="rotate(6 499 195)" />
          <circle cx="465" cy="180" r="11" fill={BLUSH} opacity="0.8" />
          <circle cx="499" cy="188" r="11" fill={PEACH} opacity="0.9" />
        </g>

        {/* Meja terapi */}
        <rect x="120" y="356" width="400" height="20" rx="10" fill="#FFFFFF" opacity="0.92" />
        <rect x="150" y="376" width="16" height="58" rx="6" fill="#FFFFFF" opacity="0.6" />
        <rect x="474" y="376" width="16" height="58" rx="6" fill="#FFFFFF" opacity="0.6" />

        {/* Kartu gambar di atas meja */}
        <g>
          <rect x="196" y="316" width="52" height="40" rx="6" fill="#FFFFFF" transform="rotate(-6 222 336)" />
          <circle cx="212" cy="330" r="6" fill={PEACH} />
          <rect x="258" y="320" width="52" height="40" rx="6" fill="#FFFFFF" opacity="0.86" transform="rotate(4 284 340)" />
          <rect x="300" y="326" width="14" height="14" rx="3" fill={BLUSH} opacity="0.75" />
        </g>

        {/* Terapis */}
        <g>
          <path d="M150 356c0-34 22-58 50-58s50 24 50 58z" fill={DEEP} opacity="0.92" />
          <circle cx="200" cy="266" r="30" fill={SKIN} />
          <path d="M170 262c0-20 14-34 30-34s30 14 30 34c-8-10-18-14-30-14s-22 4-30 14z" fill={INK} opacity="0.82" />
          <circle cx="190" cy="268" r="2.6" fill={INK} />
          <circle cx="210" cy="268" r="2.6" fill={INK} />
          <path d="M191 280q9 7 18 0" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>

        {/* Anak */}
        <g>
          <path d="M352 356c0-30 20-52 46-52s46 22 46 52z" fill="#FFFFFF" opacity="0.95" />
          <circle cx="398" cy="286" r="27" fill={SKIN} />
          <path d="M371 280c0-18 12-30 27-30s27 12 27 30c-7-9-16-13-27-13s-20 4-27 13z" fill={INK} opacity="0.7" />
          <circle cx="389" cy="288" r="2.4" fill={INK} />
          <circle cx="407" cy="288" r="2.4" fill={INK} />
          <path d="M390 298q8 7 16 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>

        {/* Gelombang suara: inti pesan klinik (bicara dilatih) */}
        <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
          <path d="M448 214q10-14 20 0t20 0" strokeWidth="4" opacity="0.95" />
          <path d="M462 194q14-20 28 0t28 0" strokeWidth="3" opacity="0.6" />
        </g>
      </svg>
    </Figure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Asesmen awal: lembar OPE dan kurva pendengaran                           */
/* -------------------------------------------------------------------------- */

export function AssessmentFigure({ className }: FigureProps) {
  return (
    <Figure
      className={className ?? 'ew-card-media'}
      label="Ilustrasi asesmen awal terapi wicara dengan bagan penilaian artikulasi"
    >
      <svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="480" height="300" fill="#FBF9F7" />
        <circle cx="60" cy="40" r="80" fill={BLUSH} opacity="0.12" />
        <rect x="54" y="52" width="270" height="196" rx="14" fill="#FFFFFF" stroke="#EFE7EE" strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <g key={row}>
            <circle cx="86" cy={84 + row * 26} r="5" fill={row < 4 ? BLUSH : '#E7E1EE'} />
            <rect x="102" y={79 + row * 26} width={row % 2 ? 150 : 118} height="8" rx="4" fill="#EFEAF3" />
            <rect x="102" y={92 + row * 26} width={row % 2 ? 96 : 132} height="6" rx="3" fill="#F4F0F7" />
          </g>
        ))}
        <g>
          <rect x="248" y="168" width="176" height="106" rx="14" fill="#FFFFFF" stroke="#EFE7EE" strokeWidth="2" />
          <polyline points="268,246 296,222 324,236 352,200 380,214 404,186" fill="none" stroke={PEACH} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={268 + i * 27} cy={[246, 222, 236, 200, 214, 186][i]} r="4" fill={DEEP} />
          ))}
        </g>
      </svg>
    </Figure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Disfagia dan IDDSI                                                        */
/* -------------------------------------------------------------------------- */

export function SwallowFigure({ className }: FigureProps) {
  return (
    <Figure
      className={className ?? 'ew-card-media'}
      label="Ilustrasi asuhan menelan dengan tingkatan tekstur makanan IDDSI"
    >
      <svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="480" height="300" fill="#FBF9F7" />
        <circle cx="420" cy="250" r="90" fill={PEACH} opacity="0.15" />
        <g>
          <path d="M120 96c34 0 54 26 54 62 0 34-24 56-54 56s-54-22-54-56c0-36 20-62 54-62z" fill="#FFFFFF" stroke="#EFE7EE" strokeWidth="3" />
          <path d="M120 118c-16 0-28 16-28 38s12 34 28 34 28-12 28-34-12-38-28-38z" fill={PEACH} opacity="0.6" />
          <path d="M120 152v46" stroke={DEEP} strokeWidth="4" strokeLinecap="round" />
        </g>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x="232" y={100 + i * 40} width={i === 3 ? 150 : 120 + i * 10} height="26" rx="13" fill={i % 2 ? '#FFFFFF' : PEACH} opacity={i % 2 ? 1 : 0.5} stroke="#EFE7EE" />
            <text x={244} y={118 + i * 40} fontSize="12" fontFamily="Open Sans, sans-serif" fontWeight="700" fill={INK} opacity="0.7">IDDSI {i + 4}</text>
          </g>
        ))}
      </svg>
    </Figure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Konsultasi AI: tiga agen menganalisis                                     */
/* -------------------------------------------------------------------------- */

export function AiTriageFigure({ className }: FigureProps) {
  return (
    <Figure
      className={className ?? 'ew-card-media'}
      label="Ilustrasi tiga agen analisis menelaah catatan konsultasi; keputusan tetap pada terapis"
    >
      <svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="480" height="300" fill="#FBF9F7" />
        <circle cx="90" cy="70" r="70" fill={BLUSH} opacity="0.12" />
        <rect x="60" y="78" width="360" height="150" rx="16" fill="#FFFFFF" stroke="#EFE7EE" strokeWidth="2" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <circle cx={116 + i * 124} cy="140" r="26" fill={i === 0 ? BLUSH : i === 1 ? PEACH : '#EFE7EE'} opacity="0.85" />
            <circle cx={116 + i * 124} cy="140" r="6" fill="#FFFFFF" />
            <rect x={76 + i * 124} y="180" width="80" height="8" rx="4" fill="#EFEAF3" />
            <rect x={86 + i * 124} y="196" width="60" height="6" rx="3" fill="#F4F0F7" />
            <line x1={142 + i * 124} y1="140" x2={192 + i * 124} y2="140" stroke="#E7E1EE" strokeWidth="3" strokeDasharray="6 6" />
          </g>
        ))}
        <rect x="300" y="40" width="140" height="30" rx="15" fill={INK} opacity="0.06" />
        <text x="320" y="60" fontSize="11" fontFamily="Open Sans, sans-serif" fontWeight="700" fill={INK} opacity="0.55">ANALISIS SAJA</text>
      </svg>
    </Figure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Jaga privasi: kunci dan perisai                                          */
/* -------------------------------------------------------------------------- */

export function PrivacyFigure({ className }: FigureProps) {
  return (
    <Figure
      className={className ?? 'ew-card-media'}
      label="Ilustrasi pelindungan data rekam medis elektronik"
    >
      <svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="480" height="300" fill="#FBF9F7" />
        <circle cx="386" cy="66" r="76" fill={BLUSH} opacity="0.1" />
        <path d="M240 66l84 30v64c0 54-36 92-84 108-48-16-84-54-84-108V96z" fill="#FFFFFF" stroke="#EFE7EE" strokeWidth="3" />
        <path d="M240 92l58 21v48c0 38-25 65-58 77-33-12-58-39-58-77v-48z" fill={PEACH} opacity="0.4" />
        <rect x="216" y="138" width="48" height="42" rx="8" fill={DEEP} />
        <path d="M228 138v-12a12 12 0 0 1 24 0v12" fill="none" stroke={DEEP} strokeWidth="5" strokeLinecap="round" />
        <circle cx="240" cy="158" r="4.5" fill="#FFFFFF" />
        <text x="186" y="268" fontSize="12" fontFamily="Open Sans, sans-serif" fontWeight="700" fill={INK} opacity="0.45">UU PDP 27/2022</text>
      </svg>
    </Figure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Kartu layanan ringkas                                                    */
/* -------------------------------------------------------------------------- */

export function ServiceGlyph({ kind }: { kind: 'bahasa' | 'bicara' | 'suara' | 'irama' | 'menelan' | 'aural' }) {
  const common = { fill: 'none', stroke: '#FFFFFF', strokeWidth: 5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="48" cy="48" r="46" fill="#FFFFFF" opacity="0.16" />
      {kind === 'bahasa' && (
        <g {...common}>
          <path d="M26 34h44a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H42l-12 10V68h-4a6 6 0 0 1-6-6V40a6 6 0 0 1 6-6z" />
          <path d="M38 48h20M38 58h12" />
        </g>
      )}
      {kind === 'bicara' && (
        <g {...common}>
          <path d="M30 58c4-18 14-28 26-28s20 8 22 20" />
          <circle cx="38" cy="62" r="7" />
          <path d="M56 44v20M70 38v32" />
        </g>
      )}
      {kind === 'suara' && (
        <g {...common}>
          <rect x="42" y="22" width="12" height="30" rx="6" />
          <path d="M32 48a16 16 0 0 0 32 0M48 64v12M38 76h20" />
        </g>
      )}
      {kind === 'irama' && (
        <g {...common}>
          <path d="M22 54q8-16 16 0t16 0 16 0 10 0" />
          <path d="M22 68q8-12 16 0t16 0" opacity="0.7" />
        </g>
      )}
      {kind === 'menelan' && (
        <g {...common}>
          <path d="M36 30c14 0 22 12 22 24S50 74 36 74 14 66 14 54s8-24 22-24z" opacity="0.55" />
          <path d="M58 40h16M58 52h22M58 64h12" />
        </g>
      )}
      {kind === 'aural' && (
        <g {...common}>
          <path d="M38 62c-8-4-12-12-12-22 0-12 10-20 22-20s22 8 22 20c0 10-6 16-12 20-4 3-6 6-6 10" />
          <circle cx="52" cy="72" r="4" />
        </g>
      )}
    </svg>
  );
}
