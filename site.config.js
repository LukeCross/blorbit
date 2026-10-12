// One switch for everything that earns money. With MONETIZED off, a build has no Buy Me a Coffee
// links and no ads (whatever GAM_REWARDED_UNIT / ADS_TXT are set to), and the privacy policy drops its advertising text.
// On by default. Turn it off with the MONETIZED=false environment variable (on GitHub: the repository variable
// MONETIZED, see deploy.yml), or by editing the fallback here.
export const MONETIZED = (process.env.MONETIZED ?? 'true').trim().toLowerCase() !== 'false';
