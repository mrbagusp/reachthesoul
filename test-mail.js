fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": "Bearer re_HxuexBuq_MLUJEwHtnoMB5euL7EBoHMHt",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "ReachTheSoul <hello@reachthesoul.org>",
    to: ["bagus.prabangkara@cbn.or.id"],
    subject: "Test dari ReachTheSoul",
    html: "<h1>Shalom!</h1><p>Ini test email dari ReachTheSoul. Setup berhasil!</p>",
  }),
}).then(r => r.json()).then(console.log).catch(console.error);