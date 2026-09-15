import { useEffect, useRef, useState } from "react";

/** Desktop width the OpenRouter mockups are designed for. */
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 900;

/**
 * Renders generated mockup HTML at desktop size, then scales it to cover the card
 * so the preview fills the frame (no empty white band below the site).
 */
export function ScaledMockupPreview({
  html,
  title,
}: {
  html: string;
  title: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;

    const update = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (width <= 0 || height <= 0) return;
      // Cover the card: fill both axes and crop overflow instead of leaving a gap.
      setScale(Math.max(width / DESIGN_WIDTH, height / DESIGN_HEIGHT));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className="absolute inset-0 overflow-hidden"
      style={{ background: "#111", zIndex: 2 }}
      aria-hidden={false}
    >
      <iframe
        srcDoc={html}
        title={title}
        sandbox="allow-scripts"
        tabIndex={-1}
        className="border-0 pointer-events-none"
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: "#111",
        }}
      />
    </div>
  );
}
