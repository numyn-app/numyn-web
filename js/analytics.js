/* Optional first-party analytics. No request before explicit consent. */
(() => {
  const key = 'numyn-analytics-choice-v2';
  const lifetime = 180 * 86400000;
  const blocked = navigator.globalPrivacyControl === true;
  const dnt = navigator.doNotTrack === '1';
  let dntOverride = false;
  let sent = false;
  let choice = null;
  let choiceAt = 0;
  function readChoice(raw) {
    choice = null; dntOverride = false; choiceAt = 0;
    try {
      const saved = JSON.parse(raw);
      if (saved && Number.isFinite(saved.at) && saved.at <= Date.now() && Date.now() - saved.at < lifetime && ['yes', 'no'].includes(saved.value)) {
        choice = saved.value; choiceAt = saved.at; dntOverride = saved.dntOverride === true;
      }
    } catch (_) {}
  }
  try {
    readChoice(localStorage.getItem(key));
    // Honour previous declines; previous approval never authorises expanded data.
    if (choice === null) {
      const old = JSON.parse(localStorage.getItem('numyn-analytics-choice-v1'));
      if (old && old.value === 'no') readChoice(JSON.stringify(old));
    }
  } catch (_) {}
  const page = location.pathname === '/index.html' ? '/' : location.pathname;
  const allowed = ["/", "/purchase.html", "/eula.html", "/privacy.html", "/contact.html", "/waitlist.html", "/support.html", "/features.html", "/faq.html", "/status.html"];
  function permitted() {
    return navigator.globalPrivacyControl !== true && choice === 'yes' && Date.now() - choiceAt < lifetime &&
      (navigator.doNotTrack !== '1' || dntOverride) && allowed.includes(page);
  }
  function send(type, details) {
    if (!permitted()) return;
    fetch('https://api.numyn.ca/api/v1/analytics/event', {
      method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({version: 2, page, type, consent: true, ...details,
        ...(navigator.doNotTrack === '1' && dntOverride ? {dnt_override: true} : {})}), keepalive: true
    }).catch(() => {});
  }
  function categories() {
    const ua = navigator.userAgent || '';
    const device = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'tablet' : /Mobile|iPhone/i.test(ua) ? 'mobile' : ua ? 'desktop' : 'unknown';
    const browser = /Edg/i.test(ua) ? 'Edge' : /SamsungBrowser/i.test(ua) ? 'Samsung Internet' : /OPR|Opera/i.test(ua) ? 'Opera' : /Firefox|FxiOS/i.test(ua) ? 'Firefox' : /Chrome|CriOS/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : 'other';
    const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /CrOS/i.test(ua) ? 'ChromeOS' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'other';
    let referral = 'direct/unknown';
    try {
      if (document.referrer) {
        const host = new URL(document.referrer).hostname.toLowerCase();
        const matches = domain => host === domain || host.endsWith('.' + domain);
        const known = ['facebook.com','instagram.com','google.com','google.ca','bing.com','duckduckgo.com','linkedin.com','reddit.com','t.co','youtube.com'];
        referral = matches('numyn.ca') ? 'internal' : known.find(matches) || 'other';
      }
    } catch (_) {}
    let load = 'unavailable';
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      const ms = nav && nav.loadEventEnd - nav.startTime;
      if (Number.isFinite(ms) && ms > 0) load = ms < 1000 ? 'under 1s' : ms < 3000 ? '1–3s' : ms < 5000 ? '3–5s' : ms < 10000 ? '5–10s' : '10s+';
    } catch (_) {}
    return {device, browser, os, referral, load};
  }
  function track() {
    if (sent || !permitted()) return;
    sent = true;
    send('pageview', categories());
  }
  const actions = new Set();
  function event(name) {
    if (!permitted() || actions.has(name)) return;
    actions.add(name); send('event', {event: name});
  }
  document.addEventListener('click', e => {
    const link = e.target.closest && e.target.closest('a[href]');
    if (!link || !permitted()) return;
    try {
      const url = new URL(link.href, location.href);
      if (!['numyn.ca','www.numyn.ca','app.numyn.ca'].includes(url.hostname)) return;
      const names = {'/features.html':'view_features','/purchase.html':'view_pricing','/waitlist.html':'open_waitlist','/contact.html':'open_contact','/services.html':'view_services'};
      const name = names[url.pathname] || (url.hostname === 'app.numyn.ca' && ['/', '/index.html'].includes(url.pathname) ? 'open_bookkeeping' : null);
      if (name) event(name);
    } catch (_) {}
  });
  window.addEventListener('numyn:waitlist-signup-success', () => {
    if (location.hostname === 'app.numyn.ca' && page === '/waitlist.html') event('signup_success');
  });
  const panel = document.createElement('section');
  panel.setAttribute('aria-label', 'Optional website analytics');
  panel.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;max-width:580px;padding:20px;background:#0d2a46;color:white;border:1px solid #f7b729;border-radius:16px;z-index:1000;box-shadow:0 4px 20px #0005;font:16px/1.5 system-ui';
  const message = document.createElement('p');
  const explanation = 'Allow optional analytics to help us improve page content, navigation and speed? We count page views, selected clicks and successful signups, recognised referral sources, broad device/browser/OS categories and page-load time ranges. Daily totals stay for 90 days. No visitor IDs, country lookup or form contents. You can decline or withdraw anytime without losing access.';
  message.textContent = blocked ? 'We respect your browser’s privacy preference. Optional analytics is off because Global Privacy Control is enabled.' :
    (dnt ? 'We respect Do Not Track: analytics is off unless you explicitly allow it for this site. ' : '') + explanation;
  panel.append(message);
  const policy = document.createElement('a');
  policy.href = 'https://app.numyn.ca/privacy.html'; policy.textContent = 'Privacy policy'; policy.style.cssText = 'color:#ffcc4d;text-decoration:underline;display:block;margin:12px 0'; panel.append(policy);
  function button(label, action, parent) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.style.cssText = 'padding:8px 14px;margin:4px;border:1px solid #f7b729;border-radius:8px;background:#0d2a46;color:white;cursor:pointer;font:inherit';
    b.addEventListener('click', action); parent.append(b); return b;
  }
  function decide(value) { choice = value; choiceAt = Date.now(); dntOverride = value === 'yes' && dnt; try {localStorage.setItem(key, JSON.stringify({value, at:choiceAt, dntOverride}));} catch (_) {} panel.hidden = true; track(); }
  if (!blocked) button(dnt ? 'Allow analytics despite Do Not Track' : 'Allow analytics', () => decide('yes'), panel);
  button(blocked ? 'Close' : 'Decline analytics', () => decide('no'), panel);
  document.body.append(panel);
  const footer = document.querySelector('footer') || document.body;
  button('Analytics preferences', () => {panel.hidden = false; panel.querySelector('button').focus();}, footer);
  panel.hidden = blocked || (choice !== null && !(dnt && choice === 'yes' && !dntOverride));
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) readChoice(event.newValue);
  });
  if (document.readyState === 'complete') setTimeout(track, 0);
  else window.addEventListener('load', () => setTimeout(track, 0), {once:true});
})();
