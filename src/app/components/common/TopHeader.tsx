import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { CircleHelp } from "lucide-react";

import { LogoSvg } from "./LogoSvg";

const HELP_SUPPORT_URL = "https://innovationcity.com/contact";

const linkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "transparent",
  border: "none",
  padding: 0,
  color: "#ffffff",
  fontFamily: "'Montserrat', sans-serif",
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1,
  cursor: "pointer",
  whiteSpace: "nowrap",
  textDecoration: "none",
};

export function TopHeader({
  initials = "AA",
  onSignOut,
  onLogoClick,
}: {
  initials?: string;
  onSignOut?: () => void;
  onLogoClick?: () => void;
} = {}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const menuId = useId();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  return (
    <div
      className="relative flex items-center"
      style={{
        height: 84,
        background: "#0b0b0b",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        fontFamily: "'Montserrat', sans-serif",
        padding: "0 clamp(16px, 4vw, 32px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {onLogoClick ? (
          <button
            type="button"
            onClick={onLogoClick}
            aria-label="Go to dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <LogoSvg />
          </button>
        ) : (
          <LogoSvg />
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(16px, 2.5vw, 28px)",
          marginLeft: "auto",
        }}
      >
        {/* Phase 2: Ask AI — restore Zap import from lucide-react when enabling
        <button type="button" style={linkStyle} aria-label="Ask AI">
          <Zap size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
        */}

        <a
          href={HELP_SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          aria-label="Help & Support"
        >
          <CircleHelp size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className="hidden sm:inline">Help & Support</span>
        </a>

        <div
          ref={profileRef}
          style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}
        >
          {profileOpen && (
            <button
              type="button"
              id={menuId}
              onClick={() => {
                onSignOut?.();
                setProfileOpen(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 32,
                padding: "0 14px",
                borderRadius: 8,
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#CB4343",
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Log out
            </button>
          )}

          <button
            type="button"
            aria-label="Open profile menu"
            aria-haspopup="true"
            aria-expanded={profileOpen}
            aria-controls={profileOpen ? menuId : undefined}
            onClick={() => setProfileOpen((open) => !open)}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid rgba(111,204,221,0.35)",
              background: "#1F3235",
              color: "#9EC9D1",
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.02em",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          >
            {initials}
          </button>
        </div>
      </div>
    </div>
  );
}
