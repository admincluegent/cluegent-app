const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
  navigator.userAgentData?.mobile === true ||
  (matchMedia('(pointer: coarse)').matches && matchMedia('(max-width: 1024px)').matches);
if (mobile && !document.querySelector('.mobile-signup')) {
  const dialog = document.createElement('dialog');
  dialog.className = 'mobile-signup';
  dialog.setAttribute('aria-labelledby', 'mobile-signup-title');
  dialog.innerHTML = `
    <button class="mobile-signup-close" type="button" aria-label="Close signup"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    <div data-signup-content>
      <div class="mobile-signup-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 20h8m-4-4v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div>
      <p class="mobile-signup-eyebrow">CLUEGENT FOR YOUR COMPUTER</p>
      <h2 id="mobile-signup-title" tabindex="-1" autofocus>Try Cluegent Free</h2>
      <p>Sign up now. We’ll email you the Windows and Mac download links.</p>
      <button class="mobile-signup-google" type="button">Continue with Google</button>
      <p class="mobile-signup-divider">or use your email</p>
      <form>
        <label for="mobile-signup-email">Email address</label>
        <input id="mobile-signup-email" type="email" autocomplete="email" required>
        <label for="mobile-signup-password">Password</label>
        <input id="mobile-signup-password" type="password" autocomplete="new-password" minlength="6" required>
        <button class="mobile-signup-submit" type="submit">Try Cluegent Free</button>
      </form>
      <button class="mobile-signup-switch" type="button">Already have an account? Sign in</button>
    </div>
    <p class="mobile-signup-status" role="status" aria-live="polite"></p>
    <button class="mobile-signup-retry" type="button" hidden>Retry sending download email</button>
  `;
  document.body.append(dialog);
  // Keep styles independent of landing-page stylesheet cache versions.
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = '/mobile-signup.css?v=20261006-polish2'; document.head.append(css);
  const status = dialog.querySelector('[role="status"]');
  const retry = dialog.querySelector('.mobile-signup-retry');
  const content = dialog.querySelector('[data-signup-content]');
  let signin = false, busy = false, sdk, previousFocus, completed = false;
  let timer;
  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* Storage is optional. */ } },
    remove(key) { try { sessionStorage.removeItem(key); } catch { /* Storage is optional. */ } },
  };
  const open = () => {
    clearTimeout(timer);
    if (!dialog.open) { previousFocus = document.activeElement; dialog.showModal(); }
  };
  const close = () => {
    clearTimeout(timer);
    storage.set('cluegent-signup-dismissed', '1');
    dialog.close(); previousFocus?.focus();
  };
  dialog.querySelector('.mobile-signup-close').onclick = close;
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  } });
  // A visible CTA stays available after dismissal, including on ad landing pages.
  const cta = document.createElement('button');
  cta.className = 'mobile-signup-cta'; cta.type = 'button'; cta.textContent = 'Try Cluegent Free';
  cta.onclick = open; document.body.append(cta);
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a');
    if (link && /apps\.microsoft\.com|github\.com\/admincluegent\/cluegent-app\/releases\/download|\/download\//.test(link.href)) {
      event.preventDefault(); open();
    }
  }, true);
  const load = async () => sdk ||= await import('/signup-auth.js');
  const setBusy = value => {
    busy = value;
    dialog.querySelectorAll('form button, .mobile-signup-google, .mobile-signup-switch, .mobile-signup-retry').forEach(button => button.disabled = value);
    content.setAttribute('aria-busy', String(value));
  };
  async function sendDownload(user) {
    retry.hidden = true;
    status.textContent = 'Sending your computer download links…';
    try {
      await sdk.httpsCallable(sdk.functions, 'sendDesktopDownloadEmail')({});
      completed = true; storage.set('cluegent-signup-complete', '1'); storage.remove('cluegent-signup-pending');
      content.hidden = true;
      dialog.querySelector('#mobile-signup-title').removeAttribute('id');
      status.id = 'mobile-signup-success'; dialog.setAttribute('aria-labelledby', status.id);
      status.textContent = 'Check your email to download Cluegent free on your computer.';
      cta.textContent = 'Check your download email';
    } catch {
      status.textContent = 'You’re signed in, but we couldn’t send your download email. Please retry.';
      retry.hidden = false;
    }
  }
  async function run(action) {
    if (busy || completed) return;
    setBusy(true); status.textContent = 'Signing you in…';
    try {
      await load();
      const user = await action();
      if (user) await sendDownload(user);
      else if (!storage.get('cluegent-signup-pending')) status.textContent = 'Choose Google or email to finish signing in.';
    } catch (error) {
      storage.remove('cluegent-signup-pending');
      status.textContent = sdk?.getFirebaseAuthErrorMessage(error) || 'Couldn’t connect. Please try again.';
    } finally { setBusy(false); }
  }
  dialog.querySelector('form').onsubmit = event => {
    event.preventDefault();
    const email = dialog.querySelector('input[type="email"]').value.trim();
    const password = dialog.querySelector('input[type="password"]').value;
    run(() => signin ? sdk.loginWithEmailPassword(email, password) : sdk.registerWithEmailPassword(email, password));
  };
  dialog.querySelector('.mobile-signup-google').onclick = () => run(async () => {
    storage.set('cluegent-signup-pending', '1');
    return sdk.loginWithGoogle();
  });
  dialog.querySelector('.mobile-signup-switch').onclick = event => {
    signin = !signin;
    dialog.querySelector('input[type="password"]').autocomplete = signin ? 'current-password' : 'new-password';
    dialog.querySelector('.mobile-signup-submit').textContent = signin ? 'Sign in & email download links' : 'Try Cluegent Free';
    event.target.textContent = signin ? 'New to Cluegent? Create an account' : 'Already have an account? Sign in';
    status.textContent = '';
  };
  retry.onclick = () => run(() => sdk.auth.currentUser);
  if (storage.get('cluegent-signup-pending')) {
    open();
    run(async () => {
      const user = await sdk.consumeGoogleRedirectResult();
      await sdk.auth.authStateReady();
      storage.remove('cluegent-signup-pending');
      return user || sdk.auth.currentUser;
    });
  } else if (!storage.get('cluegent-signup-dismissed') && !storage.get('cluegent-signup-complete')) {
    timer = setTimeout(open, 5000);
  }
}
