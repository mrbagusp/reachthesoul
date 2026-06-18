# RTS Campaign & Drip Engine

Sistem Lead Blaster + Auto Drip Campaign untuk ReachTheSoul.
Upload CSV lead → kirim email/WA → auto follow-up saat sign up → track semuanya.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SUPERADMIN UI                        │
│  CampaignManager.tsx (upload CSV, pilih template, send) │
└───────────────────┬─────────────────────────────────────┘
                    │ httpsCallable
                    ▼
┌─────────────────────────────────────────────────────────┐
│               CLOUD FUNCTIONS                           │
│                                                         │
│  campaignEngine.ts                                      │
│  ├── createCampaign()      ← called from UI             │
│  ├── processCampaignQueue  ← runs every 30 min          │
│  ├── trackEmailEvent       ← open/click tracking        │
│  └── getCampaignStats()    ← called from UI             │
│                                                         │
│  dripEngine.ts                                          │
│  ├── onUserSignup          ← Firestore trigger          │
│  ├── processDripQueue      ← runs every 1 hour          │
│  └── cancelDripOnUpgrade   ← Firestore trigger          │
│                                                         │
│  emailService.ts                                        │
│  └── sendEmail()           ← Resend API                 │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                   FIRESTORE                             │
│  campaigns/              ← campaign metadata            │
│  campaign_recipients/    ← individual recipients        │
│  drip_templates/         ← drip sequence definitions    │
│  drip_queue/             ← scheduled drip messages      │
└─────────────────────────────────────────────────────────┘
```

## Setup Steps

### 1. Resend (Email Provider)

```bash
# Sign up di resend.com (free: 100 emails/day, cukup untuk 50/day)
# Add domain reachthesoul.org → dapatkan SPF/DKIM records
# Tambahkan records ke DNS domain kamu
# Copy API key
```

### 2. Firebase Secret

```bash
# Set Resend API key sebagai Firebase secret
firebase functions:secrets:set RESEND_API_KEY
# Paste API key saat diminta
```

### 3. Install Dependencies

```bash
# Di folder functions/
npm install papaparse
npm install -D @types/papaparse

# Di folder frontend (Next.js)
npm install papaparse
npm install -D @types/papaparse
```

### 4. Deploy Cloud Functions

Tambahkan ke `functions/src/index.ts`:

```typescript
// Campaign Engine (Lead Blaster)
export {
  createCampaign,
  processCampaignQueue,
  trackEmailEvent,
  getCampaignStats,
} from "./campaignEngine";

// Drip Campaign Engine
export {
  onUserSignup,
  processDripQueue,
  cancelDripOnUpgrade,
} from "./dripEngine";
```

```bash
firebase deploy --only functions
```

### 5. Add Superadmin UI

Copy `CampaignManager.tsx` ke `components/superadmin/` dan import di superadmin page:

```tsx
import CampaignManager from "@/components/superadmin/CampaignManager";

export default function SuperAdminCampaigns() {
  return <CampaignManager />;
}
```

### 6. Firestore Indexes

Buat composite indexes di Firebase Console:

```
Collection: campaign_recipients
  Fields: campaignId ASC, status ASC

Collection: drip_queue
  Fields: status ASC, scheduledAt ASC
```

### 7. Seed Default Drip Template (Optional)

Jika ingin mengedit drip sequence dari Firestore Console:

```
Collection: drip_templates
Document ID: trial_signup
Fields: (copy dari DEFAULT_TRIAL_DRIP di dripEngine.ts)
```

## CSV Format

Upload file CSV dengan kolom berikut (case-insensitive, bahasa Indonesia juga dikenali):

```csv
name,church,city,email,whatsapp
Ps. Jeffrey Rachmat,JPCC Jakarta,Jakarta,contact@jpcc.org,087888804799
Ps. Philip Mantofa,GMS Jakarta,Jakarta,jakarta@gms.church,081521200080
```

Kolom yang dikenali:
- name / Name / nama / Nama
- church / Church / gereja / Gereja / Nama Gereja
- city / City / kota / Kota
- email / Email / E-mail
- whatsapp / WhatsApp / wa / WA / phone / Phone / telepon / Telepon

## Flow Summary

### Lead Blaster Flow
1. Upload CSV di superadmin → create campaign + recipients
2. `processCampaignQueue` jalan setiap 30 menit
3. Kirim 10 email per batch (rate-limited 3 detik per email)
4. Track open (pixel) dan click (redirect)
5. Stats real-time di dashboard

### Drip Campaign Flow
1. User sign up → `onUserSignup` trigger
2. Generate 7 scheduled messages (email + WA)
3. `processDripQueue` jalan setiap jam, kirim yang sudah due
4. User upgrade ke paid → `cancelDripOnUpgrade` cancel pending messages

## Rate Limits
- Resend free: 100 emails/day, 3,000/month
- Campaign batch: 10 emails/30 menit = max ~480/day
- Drip batch: 20 messages/hour
- Keduanya cukup untuk 50 emails/day target kamu

## TODO
- [ ] WhatsApp integration (Gupshup/Fonnte API) di campaignEngine & dripEngine
- [ ] Unsubscribe endpoint
- [ ] Drip template editor di superadmin UI
- [ ] A/B testing (kirim 2 subject line, track mana yang lebih tinggi open rate)
- [ ] Webhook Resend untuk bounce/complaint tracking
