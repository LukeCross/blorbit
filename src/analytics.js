// Anonymous usage counts through GoatCounter (https://www.goatcounter.com): no cookies, no ids, no IPs stored.
// GoatCounter has no event properties, so the detail goes in the name: `find/meadow/Sunflower`.
//
// Configured at build time (see the goatcounter plugin in vite.config.js):
//   VITE_GOATCOUNTER_URL  your counter's address, e.g. https://blorbit.goatcounter.com
// Without it (and always in the dev server) nothing is loaded and track() does nothing.
// The script itself also counts the page view on every page (game, about, privacy).

const queue = [];

// events fired before count.js has loaded wait here and are sent once it's in
function flush() {
  const gc = window.goatcounter;
  if (!gc?.count) return false;
  while (queue.length) gc.count({ path: queue.shift(), title: '', event: true });
  return true;
}

export function track(name) {
  if (!document.querySelector('script[data-goatcounter]')) return;
  queue.push(name);
  if (flush()) return;
  const t = setInterval(() => (flush() || queue.length > 50) && clearInterval(t), 500);
}
