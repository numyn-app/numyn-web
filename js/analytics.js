/* Optional first-party analytics. No request before explicit consent. */
(() => {
  const key = 'numyn-analytics-choice-v1';
  const lifetime = 180 * 86400000;
  const blocked = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  let sent = false;
  let choice = null;
  try { const saved = JSON.parse(localStorage.getItem(key)); if (saved && Date.now() - saved.at < lifetime && ['yes','no'].includes(saved.value)) choice = saved.value; } catch (_) {}
  const page = location.pathname === '/index.html' ? '/' : location.pathname;
  const allowed = ["/", "/purchase.html", "/eula.html", "/privacy.html", "/contact.html", "/waitlist.html", "/support.html", "/features.html", "/faq.html", "/status.html"];
  function track() {
    if (sent || blocked || choice !== 'yes' || !allowed.includes(page)) return;
    sent = true;
    fetch('https://api.numyn.ca/api/v1/analytics/pageview', {
      method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({page, consent: true}), keepalive: true
    }).catch(() => {});
  }
  const panel = document.createElement('section');
  panel.setAttribute('aria-label', 'Optional website analytics');
  panel.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;max-width:580px;padding:20px;background:#0d2a46;color:white;border:1px solid #f7b729;border-radius:16px;z-index:1000;box-shadow:0 4px 20px #0005;font:16px/1.5 system-ui';
  const message = document.createElement('p');
  message.textContent = blocked ? 'Your browser privacy signal disables optional analytics.' : 'Allow Numyn to count your page views to understand which public pages are used? We store daily counts by site and page for 90 days, without visitor IDs. Your choice is optional and can be changed below.';
  panel.append(message);
  const policy = document.createElement('a');
  policy.href = 'https://app.numyn.ca/privacy.html'; policy.textContent = 'Privacy policy'; policy.style.cssText = 'color:#ffcc4d;text-decoration:underline;display:block;margin:12px 0'; panel.append(policy);
  function button(label, action, parent) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.style.cssText = 'padding:8px 14px;margin:4px;border:1px solid #f7b729;border-radius:8px;background:#0d2a46;color:white;cursor:pointer;font:inherit';
    b.addEventListener('click', action); parent.append(b); return b;
  }
  function decide(value) { choice = value; try {localStorage.setItem(key, JSON.stringify({value, at:Date.now()}));} catch (_) {} panel.hidden = true; track(); }
  if (!blocked) button('Allow analytics', () => decide('yes'), panel);
  button(blocked ? 'Close' : 'Decline analytics', () => decide('no'), panel);
  document.body.append(panel);
  const footer = document.querySelector('footer') || document.body;
  button('Analytics preferences', () => {panel.hidden = false; panel.querySelector('button').focus();}, footer);
  panel.hidden = blocked || choice !== null;
  window.addEventListener('storage', event => { if (event.key === key) { choice = null; try {const saved=JSON.parse(event.newValue); if(saved && Date.now()-saved.at<lifetime) choice=saved.value;}catch(_){} } });
  track();
})();
