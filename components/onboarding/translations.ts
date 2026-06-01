export type Lang = 'id' | 'en'

export function detectLanguage(): Lang {
  if (typeof navigator === 'undefined') return 'en'
  const lang = navigator.language || ''
  return lang.startsWith('id') ? 'id' : 'en'
}

export const t = {
  welcome: {
    id: 'Selamat datang di ReachTheSoul!',
    en: 'Welcome to ReachTheSoul!',
  },
  welcomeSub: {
    id: 'Bantu kami mengenal ministry Anda agar kami bisa memberikan rekomendasi terbaik.',
    en: 'Help us understand your ministry so we can give you the best recommendation.',
  },
  letsStart: {
    id: 'Mulai',
    en: "Let's Start",
  },
  next: {
    id: 'Lanjut',
    en: 'Next',
  },
  back: {
    id: 'Kembali',
    en: 'Back',
  },
  seeResult: {
    id: 'Lihat Rekomendasi',
    en: 'See My Recommendation',
  },
  stepOf: {
    id: 'dari',
    en: 'of',
  },

  // Question 1 - Org Type
  q1: {
    id: 'Ceritakan sedikit tentang ministry Anda',
    en: 'Tell us a bit about your ministry',
  },
  q1_church: { id: 'Gereja lokal', en: 'Local church' },
  q1_ministry: { id: 'Ministry / lembaga pelayanan', en: 'Ministry / Christian organization' },
  q1_denomination: { id: 'Denominasi / jaringan gereja', en: 'Denomination / church network' },
  q1_other: { id: 'Organisasi Kristen lainnya', en: 'Other Christian organization' },

  // Question 2 - Volume
  q2: {
    id: 'Kira-kira berapa banyak orang yang menghubungi ministry Anda per bulan untuk doa atau konseling?',
    en: 'Roughly how many people contact your ministry per month for prayer or counseling?',
  },
  q2_none: { id: 'Belum ada / baru mulai', en: 'None yet / just starting' },
  q2_under10: { id: 'Di bawah 10 orang', en: 'Under 10 people' },
  q2_10to100: { id: '10 - 100 orang', en: '10 - 100 people' },
  q2_over100: { id: 'Di atas 100 orang', en: 'Over 100 people' },

  // Question 3 - Channels (multi-select)
  q3: {
    id: 'Mereka biasanya menghubungi lewat mana?',
    en: 'How do they usually reach out?',
  },
  q3_sub: {
    id: 'Pilih semua yang sesuai',
    en: 'Select all that apply',
  },
  q3_whatsapp: { id: 'WhatsApp', en: 'WhatsApp' },
  q3_instagram: { id: 'Instagram / Facebook DM', en: 'Instagram / Facebook DM' },
  q3_email: { id: 'Email', en: 'Email' },
  q3_call: { id: 'Telepon', en: 'Phone call' },
  q3_website: { id: 'Website', en: 'Website' },
  q3_none: { id: 'Belum ada channel digital', en: 'No digital channel yet' },

  // Question 4 - Pain Point
  q4: {
    id: 'Apa tantangan terbesar Anda saat ini?',
    en: 'What is your biggest challenge right now?',
  },
  q4_lost: { id: 'Pesan sering tenggelam, tidak sempat dibalas', en: 'Messages get buried and go unanswered' },
  q4_afterhours: { id: 'Tidak ada yang handle di luar jam kerja', en: 'No one handles messages outside working hours' },
  q4_scattered: { id: 'Catatan konseling tersebar di mana-mana', en: 'Counseling notes are scattered everywhere' },
  q4_notracking: { id: 'Tidak tahu berapa orang yang sudah di-follow up', en: "Can't track who has been followed up" },
  q4_nosystem: { id: 'Belum punya sistem sama sekali', en: "Don't have any system yet" },

  // Question 5 - Team Size
  q5: {
    id: 'Berapa orang di tim Anda yang akan handle percakapan ini?',
    en: 'How many people on your team will handle these conversations?',
  },
  q5_solo: { id: 'Hanya saya sendiri', en: 'Just me' },
  q5_2to5: { id: '2 - 5 orang', en: '2 - 5 people' },
  q5_6to15: { id: '6 - 15 orang', en: '6 - 15 people' },
  q5_over15: { id: 'Lebih dari 15 orang', en: 'More than 15 people' },

  // Question 6 - Urgency
  q6: {
    id: 'Seberapa cepat Anda ingin mulai?',
    en: 'How soon do you want to get started?',
  },
  q6_explore: { id: 'Saya mau explore dulu', en: 'I want to explore first' },
  q6_thisweek: { id: 'Minggu ini', en: 'This week' },
  q6_thismonth: { id: 'Bulan ini', en: 'This month' },
  q6_asap: { id: 'Secepatnya, kami sudah kewalahan', en: "ASAP, we're already overwhelmed" },

  // Results
  resultTitle: {
    id: 'Rekomendasi untuk Ministry Anda',
    en: 'Our Recommendation for Your Ministry',
  },
  exploreDashboard: {
    id: 'Explore Dashboard',
    en: 'Explore Dashboard',
  },
  upgradeTo: {
    id: 'Upgrade ke',
    en: 'Upgrade to',
  },
  scheduleDemo: {
    id: 'Jadwalkan Demo',
    en: 'Schedule a Demo',
  },
  contactTeam: {
    id: 'Hubungi Tim Kami',
    en: 'Contact Our Team',
  },
  foundingNote: {
    id: 'Founding Church Pricing: harga ini berlaku selamanya untuk early adopters.',
    en: 'Founding Church Pricing: this rate is locked permanently for early adopters.',
  },
} as const

export type TranslationKey = keyof typeof t

export function tr(key: TranslationKey, lang: Lang): string {
  return t[key][lang] || t[key]['en']
}
