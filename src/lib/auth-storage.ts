const REMEMBER_ME_STORAGE_KEY = "valet-perfect:remember-me";
const REMEMBERED_EMAIL_STORAGE_KEY = "valet-perfect:remembered-email";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getRememberMePreference() {
  if (!isBrowser()) {
    return true;
  }

  return window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY) !== "false";
}

export function setRememberMePreference(rememberMe: boolean) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(REMEMBER_ME_STORAGE_KEY, rememberMe ? "true" : "false");
}

export function getRememberedEmail() {
  if (!isBrowser()) {
    return "";
  }

  return window.localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY) ?? "";
}

export function setRememberedEmail(email: string) {
  if (!isBrowser()) {
    return;
  }

  if (email) {
    window.localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, email);
    return;
  }

  window.localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
}
