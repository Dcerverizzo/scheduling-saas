"use client";

import { useEffect, useSyncExternalStore } from "react";

const THEME_CHANGE_EVENT = "theme-toggle";

function subscribe(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback);
}

function getIsDark() {
  return document.documentElement.classList.contains("dark");
}

// No servidor não existe classList — o script inline em layout.tsx já decidiu
// o tema antes da hidratação, então o valor real só importa no cliente.
function getServerSnapshot() {
  return false;
}

export function ThemeToggle({ className }: { className?: string }) {
  const isDark = useSyncExternalStore(subscribe, getIsDark, getServerSnapshot);

  useEffect(() => {
    // Ressincroniza assim que monta: o script inline pode ter marcado <html>
    // como dark antes da hidratação, e getServerSnapshot() não tem como saber
    // disso. Dispara o mesmo evento que subscribe() escuta — não chama
    // setState direto, só avisa o useSyncExternalStore pra reler o snapshot.
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className={`flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground ${className ?? ""}`}
    >
      {isDark ? (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[18px]">
          <circle cx="10" cy="10" r="3.6" />
          <path d="M10 2v2M10 16v2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M2 10h2M16 10h2M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-[18px]">
          <path d="M16.5 12.3A6.8 6.8 0 0 1 7.7 3.5a7 7 0 1 0 8.8 8.8Z" />
        </svg>
      )}
    </button>
  );
}
