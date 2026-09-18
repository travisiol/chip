const KEY = "chip:intro-seen";

/** The opening sequence plays once per browser. */
export function introSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true; // no storage → never block the product
  }
}

export function markIntroSeen() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // ignore
  }
}

/** ?intro=1 forces it, ?intro=0 skips it — handy for captures and QA. */
export function introOverride(): boolean | null {
  if (typeof location === "undefined") return null;
  const v = new URLSearchParams(location.search).get("intro");
  return v === "1" ? true : v === "0" ? false : null;
}
