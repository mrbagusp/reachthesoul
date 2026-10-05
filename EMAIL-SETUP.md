# ReachTheSoul Email Channel — one-time platform setup

You do this **once** for the whole platform. After that, every church sets up its
own inbox from **Dashboard → Admin → Email Inbox** (no developer needed).

Inbox domain used by the code: `inbox.reachthesoul.org`
(override with `EMAIL_INBOX_DOMAIN` in `functions/.env` if you choose another subdomain).

---

## 1. Resend — receiving (inbound)

1. Resend dashboard → **Receiving** (or Domains → your domain → Receiving).
2. Add the custom receiving domain **`inbox.reachthesoul.org`** (a *subdomain*, so your
   normal email on `reachthesoul.org` keeps working).
3. Resend shows an **MX record** → add it at your DNS provider for the host `inbox`.
4. Wait until Resend shows it as verified.

## 2. Resend — sending from the same subdomain

Replies to churches' contacts are sent from `<church>@inbox.reachthesoul.org`.

1. Resend → **Domains → Add domain** → `inbox.reachthesoul.org`.
2. Add the DNS records Resend shows (DKIM / SPF / return-path) for that subdomain.
3. Wait until it says **Verified**.

> If your current Resend domain is only `reachthesoul.org`, you still need this subdomain
> verified for sending — otherwise replies will fail with a "domain not verified" error.

## 3. Resend — webhook

1. Resend → **Webhooks → Add endpoint**
   - URL: `https://asia-southeast1-reachthesoul-prod.cloudfunctions.net/webhookEmailInbound`
   - Event: **`email.received`**
2. Copy the endpoint's **signing secret** (starts with `whsec_`).

## 4. Firebase Functions env

In `functions/.env` (same file that already has `RESEND_API_KEY`):

```
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxx
# optional, only if you use a different subdomain:
# EMAIL_INBOX_DOMAIN=inbox.reachthesoul.org
```

## 5. Deploy

```powershell
firebase deploy --only functions:webhookEmailInbound,functions:listEmailInboxes,functions:createEmailInbox,functions:updateEmailInbox,functions:sendEmailForwardingTest,functions:onMessageCreated,functions:onRespondentMessage
```

## 6. Test end to end

1. Dashboard → Admin → **Email Inbox** → create an inbox (use an org on a paid plan).
2. From your phone, send an email to the shown `…@inbox.reachthesoul.org` address.
3. A ticket appears in **Tickets** with the **Email** label.
4. Reply from the ticket → the email arrives from **"<Org> via ReachTheSoul"** with
   `[RTS-xxxxx]` in the subject. Reply to it → it lands in the same ticket.
5. Set up Gmail forwarding for a test address → the Gmail confirmation code appears on the
   Email Inbox page → confirm → click **Send test email** → "Forwarding verified".

## Troubleshooting

- `firebase functions:log --only webhookEmailInbound`
  - `invalid signature` → `RESEND_WEBHOOK_SECRET` is wrong / missing.
  - `unknown inbox …` → the address doesn't match any inbox (typo or deleted inbox).
  - `skipped (mailing-list)` → newsletters/auto-replies are filtered on purpose.
- Replies not arriving → `firebase functions:log --only onMessageCreated`, look for
  `[email-out]`; usually the sending domain isn't verified in Resend yet.
- Check your Resend plan's limits for inbound and outbound email volume.
