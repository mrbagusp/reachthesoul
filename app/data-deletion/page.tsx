<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Data Deletion — ReachTheSoul</title>
<meta name="description" content="How to request deletion of your data from ReachTheSoul, operated by Blessing Media Global.">
<style>
  :root{--bg:#0f1b2d;--ink:#1c2733;--muted:#5b6b7d;--line:#e4e9ef;--accent:#2f6df6;}
  *{box-sizing:border-box;}
  body{margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:var(--ink);line-height:1.65;background:#fff;}
  .wrap{max-width:760px;margin:0 auto;padding:48px 22px 80px;}
  h1{font-size:30px;margin:0 0 6px;}
  h2{font-size:20px;margin:34px 0 10px;}
  .updated{color:var(--muted);font-size:14px;margin-bottom:26px;}
  p,li{font-size:16px;}
  ul{padding-left:20px;}
  a{color:var(--accent);}
  .card{background:#f5f8ff;border:1px solid #dfe8fb;border-radius:12px;padding:18px 20px;margin:18px 0;}
  .card h3{margin:0 0 8px;font-size:17px;}
  hr{border:none;border-top:1px solid var(--line);margin:30px 0;}
  .addr{color:var(--muted);font-size:15px;}
  footer{background:var(--bg);color:#c7d2e0;padding:30px 20px;text-align:center;font-size:14px;}
  footer a{color:#c7d2e0;text-decoration:none;margin:0 9px;}
  footer .pb{border-top:1px solid #22344c;margin-top:14px;padding-top:14px;color:#7f93a8;font-size:13px;}
  footer strong{color:#c7d2e0;}
</style>
</head>
<body>
<div class="wrap">
  <h1>Data Deletion</h1>
  <div class="updated">Last updated: <span id="d"></span></div>

  <p>ReachTheSoul ("RTS"), operated by <strong>Blessing Media Global</strong>, respects your right to have your personal data deleted. This page explains what data we hold, how to request its deletion, and what happens after you ask.</p>

  <h2>What data we may hold</h2>
  <ul>
    <li>Messages you sent to a ministry through a connected channel (Facebook Messenger, Instagram Direct, WhatsApp), which may include prayer requests or personal details.</li>
    <li>Basic profile information from the messaging platform (name, profile picture, platform user ID).</li>
    <li>For ministry account holders: account and contact details and connected-account information.</li>
  </ul>
  <p>All data is stored in Google Firebase / Firestore in the Singapore region.</p>

  <h2>How to request deletion</h2>

  <div class="card">
    <h3>1. If you contacted a ministry through RTS</h3>
    <p>Reply to that ministry, or email us directly, asking for your data to be deleted. Please include the name or handle you used and the ministry/page you contacted, so we can locate your records.</p>
  </div>

  <div class="card">
    <h3>2. Email us directly</h3>
    <p>Send a request to <a href="mailto:privacy@reachthesoul.org?subject=Data%20Deletion%20Request">privacy@reachthesoul.org</a> with the subject line <strong>"Data Deletion Request."</strong> Include:</p>
    <ul>
      <li>The messaging platform you used (Facebook, Instagram, or WhatsApp)</li>
      <li>The name/username or profile you messaged from</li>
      <li>The ministry or page you contacted</li>
    </ul>
  </div>

  <div class="card">
    <h3>3. Ministry account holders</h3>
    <p>If you are a ministry using RTS and want your organization's data deleted, contact us at the email above. When you stop using the service, your data is retained for one (1) month and then permanently deleted automatically (see below).</p>
  </div>

  <h2>What happens next</h2>
  <ul>
    <li>We will confirm your request and verify enough details to locate the correct data.</li>
    <li>We will delete the requested personal data from our active systems, and it will be removed from backups in the normal backup-rotation cycle.</li>
    <li><strong>For ministries that stop using RTS:</strong> data is retained for one (1) month after the account ends, to allow for reactivation or export, and is then permanently deleted.</li>
    <li>We will confirm to you when deletion is complete, and respond within the time required by applicable law.</li>
  </ul>

  <h2>Data handled by the ministry</h2>
  <p>Some data you shared may also be held directly by the ministry you contacted (for example, in their own follow-up records). For data they control independently, you may also need to contact that ministry directly. We will help direct your request where we can.</p>

  <h2>Contact</h2>
  <p class="addr"><strong>Blessing Media Global</strong> (operator of ReachTheSoul)<br>
  D Java Residence Blok C2 No. 16, Kabupaten Bekasi, Jawa Barat 17836, Indonesia<br>
  Email: <a href="mailto:privacy@reachthesoul.org">privacy@reachthesoul.org</a></p>
</div>

<footer>
  <div>
    <a href="/about">About</a>
    <a href="/privacy">Privacy Policy</a>
    <a href="/data-deletion">Data Deletion</a>
    <a href="/contact">Contact</a>
  </div>
  <div class="pb">Powered by <strong>Blessing Media Global</strong><br>
  &copy; <span id="y"></span> Blessing Media Global. All rights reserved.</div>
</footer>

<script>
  var now=new Date();
  document.getElementById('y').textContent=now.getFullYear();
  document.getElementById('d').textContent=now.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
</script>
</body>
</html>