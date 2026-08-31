import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "sidebar-open";
const BREAKPOINT = 1024;

interface SidebarContextType {
  isOpen: boolean;
  isMobile: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

function getInitialIsOpen(isMobile: boolean) {
  if (isMobile) return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "true";
  } catch {
    // ignore
  }
  return true;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= BREAKPOINT;
  });

  const [isOpen, setIsOpen] = useState(() => {
    const mobile = typeof window !== "undefined" ? window.innerWidth <= BREAKPOINT : false;
    return getInitialIsOpen(mobile);
  });

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth <= BREAKPOINT;
      setIsMobile(mobile);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Persist only desktop preference
  useEffect(() => {
    if (isMobile) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(isOpen));
    } catch {
      // ignore
    }
  }, [isOpen, isMobile]);

  // ESC closes drawer on mobile
  useEffect(() => {
    if (!isMobile || !isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile, isOpen]);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    if (isMobile && isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMobile, isOpen]);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SidebarContext.Provider value={{ isOpen, isMobile, toggle, open, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
