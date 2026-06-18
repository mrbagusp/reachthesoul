# RTS Campaign & Drip Engine — Firestore Schema

## Collections

### `campaigns/{campaignId}`
Stores campaign metadata (one-time blast campaigns).

```
{
  name: "Outreach Gereja Jakarta Batch 1",
  type: "blast",                          // "blast" | "drip"
  channel: "email",                       // "email" | "whatsapp" | "both"
  subject: "Ada jiwa yang mengirim pesan jam 2 pagi...",
  templateBody: "Shalom {{name}}...",     // supports {{name}}, {{church}}, {{city}}
  status: "draft",                        // "draft" | "scheduled" | "sending" | "completed" | "paused"
  scheduledAt: Timestamp | null,
  stats: {
    total: 50,
    sent: 45,
    failed: 5,
    opened: 30,
    clicked: 15,
    replied: 5,
    signedUp: 3
  },
  createdBy: "adminUserId",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `campaign_recipients/{recipientId}`
Individual recipients per campaign.

```
{
  campaignId: "campaignId",
  name: "Ps. Jeffrey Rachmat",
  church: "JPCC Jakarta",
  city: "Jakarta",
  email: "contact@jpcc.org",
  whatsapp: "087888804799",
  channel: "email",                       // channel used for this recipient
  status: "pending",                      // "pending" | "queued" | "sent" | "delivered" | "opened" | "clicked" | "replied" | "signed_up" | "failed" | "bounced"
  messageId: "resend_msg_id",            // from email provider
  sentAt: Timestamp | null,
  openedAt: Timestamp | null,
  clickedAt: Timestamp | null,
  error: null | "error message",
  createdAt: Timestamp
}
```

### `drip_templates/{templateId}`
Drip sequence definitions (configured from superadmin).

```
{
  name: "Trial Signup Sequence",
  trigger: "user_signup",                 // "user_signup" | "trial_expiring" | "inactive_3days"
  active: true,
  steps: [
    {
      stepNumber: 1,
      delayHours: 0,                      // send immediately
      channel: "email",
      subject: "Welcome to ReachTheSoul!",
      body: "Shalom {{name}}, terima kasih sudah bergabung..."
    },
    {
      stepNumber: 2,
      delayHours: 0,
      channel: "whatsapp",
      body: "Shalom {{name}}! Terima kasih sudah daftar di ReachTheSoul..."
    },
    {
      stepNumber: 3,
      delayHours: 24,
      channel: "email",
      subject: "Sudah connect channel pertama?",
      body: "Halo {{name}}, sudah sempat explore dashboard?..."
    },
    {
      stepNumber: 4,
      delayHours: 72,
      channel: "whatsapp",
      body: "Halo {{name}}, sudah 3 hari di RTS! Sudah coba connect WhatsApp?..."
    },
    {
      stepNumber: 5,
      delayHours: 120,
      channel: "email",
      subject: "3 gereja sudah pakai RTS — ini cerita mereka",
      body: "..."
    },
    {
      stepNumber: 6,
      delayHours: 336,
      channel: "email",
      subject: "Trial hampir habis — upgrade sekarang",
      body: "..."
    }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `drip_queue/{queueId}`
Individual scheduled drip messages.

```
{
  templateId: "trial_signup",
  stepNumber: 3,
  orgId: "orgId",
  recipientId: "userId",
  recipientName: "Ps. Budi",
  recipientEmail: "budi@gbi.org",
  recipientPhone: "08123456789",
  channel: "email",
  subject: "Sudah connect channel pertama?",
  body: "Halo Ps. Budi, sudah sempat explore dashboard?...",
  scheduledAt: Timestamp,
  status: "pending",                      // "pending" | "sent" | "failed" | "cancelled"
  sentAt: Timestamp | null,
  error: null,
  createdAt: Timestamp
}
```

## Indexes Needed

```
// For processing campaign queue
campaign_recipients: campaignId ASC, status ASC

// For processing drip queue  
drip_queue: status ASC, scheduledAt ASC

// For analytics
campaign_recipients: campaignId ASC, status ASC
drip_queue: templateId ASC, status ASC
```
