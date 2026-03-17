import { createClient } from "@supabase/supabase-js";

const REMEMBER_ME_STORAGE_KEY = "valet-perfect:remember-me";
const REMEMBERED_EMAIL_STORAGE_KEY = "valet-perfect:remembered-email";

function isBrowser() {
  return typeof window !== "undefined";
}

function getPreferredStorage() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(REMEMBER_ME_STORAGE_KEY) === "false" ? window.sessionStorage : window.localStorage;
}

const authStorage = {
  getItem(key: string) {
    if (!isBrowser()) {
      return null;
    }

    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    if (!isBrowser()) {
      return;
    }

    const targetStorage = getPreferredStorage();
    const otherStorage = targetStorage === window.localStorage ? window.sessionStorage : window.localStorage;
    targetStorage?.setItem(key, value);
    otherStorage.removeItem(key);
  },
  removeItem(key: string) {
    if (!isBrowser()) {
      return;
    }

    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

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

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
