// Rewarded video ads through Google Ad Manager, using the Google Publisher Tag (GPT).
// https://developers.google.com/publisher-tag/samples/display-rewarded-ad
// Policy: https://support.google.com/admanager/answer/7496282
//
// Configured at build time:
//   VITE_GAM_REWARDED_UNIT  your rewarded ad unit path, e.g. /1234567/blorbit_rewarded
// The dev server falls back to Google's public demo unit, which serves sample ads. A production
// build without an ad unit has no ads at all: GPT never loads and the free-pack buttons stay hidden.
//
// Flow: define a REWARDED out-of-page slot and request it. When `rewardedSlotReady` fires we keep
// its makeRewardedVisible() and only call it after the player has said yes to our own prompt.
// `rewardedSlotGranted` means they earned the reward; `rewardedSlotClosed` means the ad is gone,
// so we hand out the reward (or not) and request a fresh slot for next time.

const DEV = import.meta.env.DEV;
const DEMO_UNIT = '/22639388115/rewarded_web_example';
const UNIT = import.meta.env.VITE_GAM_REWARDED_UNIT || (DEV ? DEMO_UNIT : '');

// While a rewarded ad is open, GPT adds "#goog_rewarded" to the address (so the phone's Back button
// closes the ad) and can leave it behind afterwards. The game never uses the hash, so once the ad
// has closed we quietly put the address back. replaceState doesn't reload or add a history step,
// and unlike history.back() it can never take the player away from the game.
const AD_HASH = /^#goog[_-]?rewarded/i;
function tidyAddressBar() {
  const clean = () => {
    if (AD_HASH.test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search);
  };
  clean();
  setTimeout(clean, 300); // GPT sometimes restores the hash a moment after closing
}

export class RewardedAds {
  constructor({ onPause, onResume } = {}) {
    this.enabled = !!UNIT;
    this.demo = UNIT === DEMO_UNIT;
    this.supported = true; // GPT says no (null slot) on pages/devices without rewarded support
    this.onPause = onPause;
    this.onResume = onResume;
    this.slot = null;
    this.makeVisible = null; // set while a video is ready to play
    this.showing = false;
    this.granted = null;
    this.listeners = new Set();
    // which privacy rules cover this visitor, as reported by Google's consent tool (null = not known yet)
    this.consent = { gdpr: null, usStates: null };
    if (!this.enabled) return;

    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
    s.onerror = () => { this.blocked = true; this.emit(); }; // e.g. an ad blocker
    document.head.appendChild(s);
    window.googletag = window.googletag || { cmd: [] };
    // Consent: Google's certified Privacy & messaging tool runs through this same GPT tag once a
    // consent message is published in Ad Manager, and GPT waits for the player's choice by itself.
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    googletag.cmd.push(() => this.listen());
    this.watchConsentRules();
    this.arm();
  }

  get ready() {
    return !!this.makeVisible && !this.showing;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.listeners.forEach((fn) => fn(this.ready));
  }

  // page-wide GPT events, registered once; each one checks it's about our current slot
  listen() {
    const pubads = googletag.pubads();
    pubads.addEventListener('rewardedSlotReady', (e) => {
      if (e.slot !== this.slot) return;
      this.makeVisible = () => e.makeRewardedVisible();
      this.emit();
    });
    pubads.addEventListener('rewardedSlotGranted', (e) => {
      if (e.slot === this.slot) this.granted = e.payload || {};
    });
    pubads.addEventListener('rewardedSlotClosed', (e) => {
      if (e.slot !== this.slot) return;
      const handlers = this.handlers;
      const granted = this.granted;
      this.reset();
      tidyAddressBar();
      this.onResume?.();
      if (granted) handlers?.onReward?.(granted);
      else handlers?.onDismiss?.();
      setTimeout(() => this.arm(), 1000); // line up the next one
    });
    pubads.addEventListener('slotRenderEnded', (e) => {
      if (e.slot !== this.slot || !e.isEmpty) return;
      // no ad came back this time: try again a bit later
      this.reset();
      this.empty = true;
      setTimeout(() => this.arm(), 30000);
    });
    googletag.enableServices();
  }

  reset() {
    if (this.slot) googletag.destroySlots([this.slot]);
    this.slot = null;
    this.makeVisible = null;
    this.showing = false;
    this.granted = null;
    this.handlers = null;
    this.emit();
  }

  // Request a rewarded ad so one is ready when the player asks for it.
  arm() {
    if (!this.enabled || !this.supported || this.slot || this.showing) return;
    googletag.cmd.push(() => {
      if (this.slot) return;
      const slot = googletag.defineOutOfPageSlot(UNIT, googletag.enums.OutOfPageFormat.REWARDED);
      if (!slot) {
        this.supported = false; // this page or device can't show rewarded ads
        this.emit();
        return;
      }
      this.empty = false;
      this.slot = slot;
      slot.addService(googletag.pubads());
      googletag.display(slot);
    });
  }

  // Play the ready video. Only call this after the player has agreed to watch it.
  show(handlers) {
    if (!this.ready) return false;
    this.handlers = handlers;
    this.showing = true;
    this.onPause?.();
    const fn = this.makeVisible;
    this.makeVisible = null;
    this.emit();
    fn();
    return true;
  }

  // Ask Google's consent tool which privacy rules cover this visitor, so the game only offers
  // "Privacy & cookie settings" where there's actually something to change.
  //  - European rules (EEA, UK, Switzerland): the IAB TCF API reports gdprApplies.
  //  - US state rules: Google reports whether its opt-out ("Do not sell or share") applies.
  // Nothing here runs unless Google's tool loads (it doesn't if blocked, or with no published message).
  watchConsentRules() {
    const q = window.googlefc.callbackQueue;
    q.push({
      CONSENT_API_READY: () => window.__tcfapi?.('addEventListener', 0, (tcdata, success) => {
        this.consent.gdpr = !!(success && tcdata?.gdprApplies);
        this.emit();
      }),
    });
    q.push({
      INITIAL_US_STATES_OPT_OUT_DATA_READY: () => {
        const opt = window.googlefc.usstatesoptout;
        const status = opt?.getInitialUsStatesOptOutStatus?.();
        const E = opt?.InitialUsStatesOptOutStatusEnum ?? { NOT_OPTED_OUT: 2, OPTED_OUT: 3 };
        this.consent.usStates = status === E.NOT_OPTED_OUT || status === E.OPTED_OUT;
        this.emit();
      },
    });
  }

  // true when this visitor has consent choices they can review
  get consentApplies() {
    return !!(this.consent.gdpr || this.consent.usStates);
  }

  // Re-open the visitor's privacy choices (Google requires this to be available at all times):
  // the European consent message, or the US state "Do not sell or share" dialog.
  // Resolves false if Google's consent tool doesn't respond (e.g. it was blocked).
  openConsentSettings() {
    if (!this.enabled || !this.consentApplies) return Promise.resolve(false);
    return new Promise((resolve) => {
      let ran = false;
      window.googlefc.callbackQueue.push({
        CONSENT_API_READY: () => {
          ran = true;
          if (this.consent.gdpr) window.googlefc.showRevocationMessage();
          else window.googlefc.usstatesoptout.openConfirmationDialog(() => {});
          resolve(true);
        },
      });
      setTimeout(() => !ran && resolve(false), 2500);
    });
  }

  // For a "find me a video" retry when nothing was ready: resolves true once one is.
  async waitForReady(ms = 4000) {
    if (this.ready) return true;
    if (!this.enabled || !this.supported) return false;
    this.arm();
    const start = performance.now();
    while (performance.now() - start < ms) {
      await new Promise((r) => setTimeout(r, 150));
      if (this.ready) return true;
    }
    return this.ready;
  }
}
