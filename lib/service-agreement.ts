// Basic Service Agreement (bilingual EN / ID) generated as a PDF in the browser.
//
// ⚠️ This is a basic template. Have it reviewed once by a lawyer before relying on it.
// Organizations that need changes or a custom agreement contact hello@reachthesoul.org.

export const AGREEMENT_VERSION = "2026-10";

export const PROVIDER = {
  name: "Blessing Media Global",
  product: "ReachTheSoul (reachthesoul.org)",
  address: "D Java Residence Blok C2 No. 16, Kabupaten Bekasi, Jawa Barat 17836, Indonesia",
  email: "hello@reachthesoul.org",
  whatsapp: "+62 852-1797-1464",
};

export type AgreementInput = {
  orgId: string;
  orgLegalName: string;
  orgAddress: string;
  signatoryName: string;
  signatoryTitle: string;
  signatoryEmail: string;
  planName: string;
  planPriceUsd: number;     // per month; 0 for Free
  acceptedAt: Date;
};

export function agreementId(input: Pick<AgreementInput, "orgId" | "acceptedAt">): string {
  const d = input.acceptedAt;
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const org = input.orgId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  return `RTS-SA-${org}-${ymd}`;
}

type Section = { title: string; paragraphs: string[] };

function fmtDate(d: Date, locale: "en" | "id"): string {
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function priceText(p: AgreementInput, locale: "en" | "id"): string {
  if (!p.planPriceUsd) return locale === "en" ? "free of charge" : "tanpa biaya";
  return locale === "en"
    ? `USD ${p.planPriceUsd.toFixed(2)} per month`
    : `USD ${p.planPriceUsd.toFixed(2)} per bulan`;
}

export function buildSections(p: AgreementInput, locale: "en" | "id"): Section[] {
  const org = p.orgLegalName;
  const addr = p.orgAddress ? (locale === "en" ? `, with its address at ${p.orgAddress}` : `, beralamat di ${p.orgAddress}`) : "";

  if (locale === "en") {
    return [
      {
        title: "1. Parties",
        paragraphs: [
          `First Party: ${PROVIDER.name}, operator of ${PROVIDER.product}, with its address at ${PROVIDER.address} ("ReachTheSoul").`,
          `Second Party: ${org}${addr}, represented by ${p.signatoryName} as ${p.signatoryTitle} (the "Client").`,
        ],
      },
      {
        title: "2. Service",
        paragraphs: [
          `ReachTheSoul provides the Client with access to the ReachTheSoul platform, a prayer, counseling and pastoral care management system, under the ${p.planName} plan, with the features and limits described on reachthesoul.org and in the Client's dashboard (Billing page) at the time of subscription.`,
        ],
      },
      {
        title: "3. Fees and Payment",
        paragraphs: [
          `The subscription fee for the ${p.planName} plan is ${priceText(p, "en")}. Payments are processed by Paddle as merchant of record, which issues the official invoices and receipts; applicable taxes are calculated by Paddle.`,
          `Third-party fees are not included in the subscription fee and are paid by the Client directly to the provider concerned, including: WhatsApp message fees charged per message by Meta to the Client's WhatsApp Business account; AI provider fees when the Client uses its own API key; and telephony provider fees. ReachTheSoul adds no markup to these fees. Any fee estimates shown in the dashboard are for information only.`,
        ],
      },
      {
        title: "4. Term and Termination",
        paragraphs: [
          `This Agreement starts on the acceptance date below and continues month to month while the Client's subscription is active. The Client may cancel at any time from the Billing page; cancellation takes effect at the end of the current billing period. Refunds follow the ReachTheSoul Refund Policy. Either party may end this Agreement if the other party materially breaches it and does not remedy the breach within 14 days of written notice.`,
        ],
      },
      {
        title: "5. Obligations of ReachTheSoul",
        paragraphs: [
          `ReachTheSoul will: (a) provide and maintain the platform with reasonable care and skill; (b) apply appropriate technical and organizational security measures to protect the Client's data; (c) provide support by email and WhatsApp; (d) give at least 30 days' notice of price changes or material changes to the service; and (e) keep the Client's data confidential and never sell it.`,
        ],
      },
      {
        title: "6. Obligations of the Client",
        paragraphs: [
          `The Client will: (a) use the platform lawfully and in line with the ReachTheSoul Terms of Service; (b) comply with Meta / WhatsApp, Instagram and Facebook policies and applicable laws, including obtaining any consent required from the people it communicates with; (c) keep a valid payment method on its WhatsApp Business account when using WhatsApp; (d) keep account credentials secure and manage its team's access; and (e) remain responsible for its own pastoral, counseling and ministry decisions. AI features are support tools and do not replace human pastoral or professional judgment.`,
        ],
      },
      {
        title: "7. Data Ownership and Confidentiality",
        paragraphs: [
          `All data entered into or received through the platform for the Client (including respondents, conversations and notes) belongs to the Client. ReachTheSoul processes it only to provide the service, as described in the ReachTheSoul Privacy Policy. The Client may request export or deletion of its data at any time. Both parties keep the other party's confidential information confidential during and after this Agreement.`,
        ],
      },
      {
        title: "8. Limitation of Liability",
        paragraphs: [
          `The platform is provided on a best-effort availability basis; no service-level guarantee applies unless agreed separately in writing (e.g. Enterprise). To the maximum extent permitted by law, neither party is liable for indirect or consequential damages, and ReachTheSoul's total liability is limited to the fees paid by the Client in the twelve (12) months before the claim.`,
        ],
      },
      {
        title: "9. General",
        paragraphs: [
          `The ReachTheSoul Terms of Service, Privacy Policy and Refund Policy form part of this Agreement. Changes to this Agreement must be agreed in writing by both parties. This Agreement is governed by the laws of the Republic of Indonesia; the parties will first try to resolve any dispute amicably. This Agreement is made in English and Indonesian; both versions are equally valid, and in case of any difference in interpretation the Indonesian version prevails.`,
          `This Agreement was accepted electronically by the Client's representative through the ReachTheSoul dashboard. Organizations that need changes or a custom agreement can contact ${PROVIDER.email}.`,
        ],
      },
    ];
  }

  return [
    {
      title: "1. Para Pihak",
      paragraphs: [
        `Pihak Pertama: ${PROVIDER.name}, pengelola ${PROVIDER.product}, beralamat di ${PROVIDER.address} ("ReachTheSoul").`,
        `Pihak Kedua: ${org}${addr}, diwakili oleh ${p.signatoryName} selaku ${p.signatoryTitle} ("Klien").`,
      ],
    },
    {
      title: "2. Layanan",
      paragraphs: [
        `ReachTheSoul memberikan Klien akses ke platform ReachTheSoul, yaitu sistem pengelolaan doa, konseling, dan pelayanan pastoral, dengan paket ${p.planName}, sesuai fitur dan batasan yang tercantum di reachthesoul.org dan di dashboard Klien (halaman Billing) pada saat berlangganan.`,
      ],
    },
    {
      title: "3. Biaya dan Pembayaran",
      paragraphs: [
        `Biaya berlangganan paket ${p.planName} adalah ${priceText(p, "id")}. Pembayaran diproses oleh Paddle sebagai merchant of record, yang menerbitkan invoice dan bukti pembayaran resmi; pajak yang berlaku dihitung oleh Paddle.`,
        `Biaya pihak ketiga tidak termasuk dalam biaya berlangganan dan dibayar langsung oleh Klien kepada penyedia terkait, antara lain: biaya pesan WhatsApp yang dikenakan Meta per pesan ke akun WhatsApp Business Klien; biaya penyedia AI apabila Klien menggunakan API key sendiri; dan biaya penyedia telepon. ReachTheSoul tidak menambahkan margin atas biaya tersebut. Estimasi biaya yang ditampilkan di dashboard hanya bersifat informasi.`,
      ],
    },
    {
      title: "4. Jangka Waktu dan Pengakhiran",
      paragraphs: [
        `Perjanjian ini berlaku sejak tanggal persetujuan di bawah dan berlanjut setiap bulan selama langganan Klien aktif. Klien dapat membatalkan langganan kapan saja melalui halaman Billing; pembatalan berlaku pada akhir periode tagihan yang sedang berjalan. Pengembalian dana mengikuti Kebijakan Refund ReachTheSoul. Masing-masing pihak dapat mengakhiri Perjanjian ini apabila pihak lain melakukan pelanggaran material dan tidak memperbaikinya dalam 14 hari sejak pemberitahuan tertulis.`,
      ],
    },
    {
      title: "5. Kewajiban ReachTheSoul",
      paragraphs: [
        `ReachTheSoul wajib: (a) menyediakan dan memelihara platform dengan kehati-hatian dan keahlian yang wajar; (b) menerapkan langkah keamanan teknis dan organisasi yang memadai untuk melindungi data Klien; (c) memberikan dukungan melalui email dan WhatsApp; (d) memberitahukan perubahan harga atau perubahan material layanan paling lambat 30 hari sebelumnya; dan (e) menjaga kerahasiaan data Klien dan tidak menjualnya.`,
      ],
    },
    {
      title: "6. Kewajiban Klien",
      paragraphs: [
        `Klien wajib: (a) menggunakan platform secara sah dan sesuai Ketentuan Layanan ReachTheSoul; (b) mematuhi kebijakan Meta / WhatsApp, Instagram dan Facebook serta peraturan yang berlaku, termasuk memperoleh persetujuan yang diperlukan dari orang-orang yang dihubungi; (c) menjaga metode pembayaran yang valid pada akun WhatsApp Business apabila menggunakan WhatsApp; (d) menjaga keamanan kredensial akun dan mengatur akses timnya; dan (e) tetap bertanggung jawab atas keputusan pastoral, konseling, dan pelayanannya sendiri. Fitur AI adalah alat bantu dan tidak menggantikan pertimbangan pastoral maupun profesional manusia.`,
      ],
    },
    {
      title: "7. Kepemilikan Data dan Kerahasiaan",
      paragraphs: [
        `Seluruh data yang dimasukkan atau diterima melalui platform untuk Klien (termasuk responden, percakapan, dan catatan) adalah milik Klien. ReachTheSoul hanya memproses data tersebut untuk menyediakan layanan, sebagaimana dijelaskan dalam Kebijakan Privasi ReachTheSoul. Klien dapat meminta ekspor atau penghapusan datanya kapan saja. Para pihak wajib menjaga kerahasiaan informasi rahasia pihak lainnya selama dan setelah Perjanjian ini berakhir.`,
      ],
    },
    {
      title: "8. Batasan Tanggung Jawab",
      paragraphs: [
        `Platform disediakan berdasarkan upaya terbaik untuk ketersediaan layanan; tidak ada jaminan tingkat layanan (SLA) kecuali disepakati terpisah secara tertulis (misalnya paket Enterprise). Sejauh diizinkan hukum, para pihak tidak bertanggung jawab atas kerugian tidak langsung atau konsekuensial, dan total tanggung jawab ReachTheSoul terbatas pada biaya yang dibayar Klien dalam dua belas (12) bulan sebelum klaim.`,
      ],
    },
    {
      title: "9. Ketentuan Umum",
      paragraphs: [
        `Ketentuan Layanan, Kebijakan Privasi, dan Kebijakan Refund ReachTheSoul merupakan bagian dari Perjanjian ini. Perubahan atas Perjanjian ini harus disepakati secara tertulis oleh para pihak. Perjanjian ini tunduk pada hukum Negara Republik Indonesia; para pihak akan terlebih dahulu menyelesaikan perselisihan secara musyawarah. Perjanjian ini dibuat dalam bahasa Inggris dan bahasa Indonesia; kedua versi sama-sama berlaku, dan apabila terdapat perbedaan penafsiran, versi bahasa Indonesia yang berlaku.`,
        `Perjanjian ini disetujui secara elektronik oleh perwakilan Klien melalui dashboard ReachTheSoul. Organisasi yang memerlukan perubahan atau perjanjian khusus dapat menghubungi ${PROVIDER.email}.`,
      ],
    },
  ];
}

/** Builds the PDF and returns the jsPDF instance (call .save() in the browser). */
export async function buildAgreementPdf(p: AgreementInput) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 56;              // margin
  const maxW = W - M * 2;
  const id = agreementId(p);
  let y = M;

  const footer = () => {
    const pages = pdf.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(140);
      pdf.text(`${id} · Version ${AGREEMENT_VERSION} · ${PROVIDER.product}`, M, H - 28);
      pdf.text(`Page ${i} / ${pages}`, W - M, H - 28, { align: "right" });
    }
  };

  const ensure = (h: number) => {
    if (y + h > H - 56) { pdf.addPage(); y = M; }
  };

  const text = (str: string, size: number, opts: { bold?: boolean; color?: number; gap?: number; align?: "left" | "center" } = {}) => {
    pdf.setFont("helvetica", opts.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(opts.color ?? 30);
    const lines = pdf.splitTextToSize(str, maxW) as string[];
    const lh = size * 1.45;
    for (const line of lines) {
      ensure(lh);
      if (opts.align === "center") pdf.text(line, W / 2, y, { align: "center" });
      else pdf.text(line, M, y);
      y += lh;
    }
    y += opts.gap ?? 0;
  };

  const rule = () => { ensure(12); pdf.setDrawColor(210); pdf.line(M, y, W - M, y); y += 14; };

  const renderVersion = (locale: "en" | "id") => {
    text(locale === "en" ? "SERVICE AGREEMENT" : "PERJANJIAN LAYANAN", 16, { bold: true, align: "center", gap: 2 });
    text(locale === "en" ? "ReachTheSoul Platform Subscription" : "Langganan Platform ReachTheSoul", 10, { align: "center", color: 100, gap: 4 });
    text(`${locale === "en" ? "Agreement No." : "Nomor Perjanjian"}: ${id}`, 9, { align: "center", color: 100 });
    text(`${locale === "en" ? "Date" : "Tanggal"}: ${fmtDate(p.acceptedAt, locale)}`, 9, { align: "center", color: 100, gap: 8 });
    rule();
    for (const s of buildSections(p, locale)) {
      ensure(40);
      text(s.title, 10.5, { bold: true, gap: 2 });
      for (const para of s.paragraphs) text(para, 9.5, { gap: 6 });
      y += 2;
    }
  };

  renderVersion("en");
  pdf.addPage(); y = M;
  renderVersion("id");

  // Acceptance block
  ensure(170);
  y += 6;
  rule();
  text("ACCEPTANCE / PERSETUJUAN", 10.5, { bold: true, gap: 6 });
  const accepted = p.acceptedAt.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const colW = (maxW - 24) / 2;
  const startY = y;
  pdf.setFontSize(9);
  const block = (x: number, title: string, lines: string[]) => {
    let yy = startY;
    pdf.setFont("helvetica", "bold"); pdf.setTextColor(30); pdf.text(title, x, yy); yy += 14;
    pdf.setFont("helvetica", "normal"); pdf.setTextColor(60);
    for (const l of lines) {
      for (const w of pdf.splitTextToSize(l, colW) as string[]) { pdf.text(w, x, yy); yy += 12; }
    }
    return yy;
  };
  const y1 = block(M, "First Party / Pihak Pertama", [
    PROVIDER.name,
    PROVIDER.product,
    PROVIDER.email,
    "Issued electronically / Diterbitkan secara elektronik",
  ]);
  const y2 = block(M + colW + 24, "Second Party / Pihak Kedua", [
    p.orgLegalName,
    `${p.signatoryName} — ${p.signatoryTitle}`,
    p.signatoryEmail,
    `Accepted electronically / Disetujui secara elektronik: ${accepted}`,
  ]);
  y = Math.max(y1, y2) + 10;
  text(`Need changes or a custom agreement? / Butuh perubahan atau perjanjian khusus? ${PROVIDER.email} · WhatsApp ${PROVIDER.whatsapp}`, 8.5, { color: 110 });

  footer();
  return { pdf, id, filename: `${id}_ReachTheSoul_Service_Agreement.pdf` };
}
