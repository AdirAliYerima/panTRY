import { motion } from "motion/react";
import avocado from "@/assets/food-avocado.png";
import lemon from "@/assets/food-lemon.png";
import tomato from "@/assets/food-tomato.png";
import pasta from "@/assets/food-pasta.png";
import herbs from "@/assets/food-herbs.png";
import eggs from "@/assets/food-eggs.png";
import bread from "@/assets/food-bread.png";

import photoTomatoes from "@/assets/photo-tomatoes.jpg";
import photoPasta from "@/assets/photo-pasta.jpg";
import photoGreens from "@/assets/photo-greens.jpg";
import photoBread from "@/assets/photo-bread.jpg";
import photoCitrus from "@/assets/photo-citrus-herbs.jpg";
import photoEggs from "@/assets/photo-eggs.jpg";

type Photo = {
  src: string;
  alt: string;
  /** position relative to viewport edges (any CSS unit) */
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  w: number;
  h: number;
  rot: number;
  dx: string;
  dy: string;
  delay: number;
};

const photos: Photo[] = [
  { src: photoTomatoes, alt: "Vine tomatoes", top: "8%", left: "2%", w: 200, h: 250, rot: -6, dx: "8px", dy: "-10px", delay: 0 },
  { src: photoCitrus, alt: "Lemons & herbs", top: "6%", right: "3%", w: 240, h: 200, rot: 5, dx: "-10px", dy: "12px", delay: 0.1 },
  { src: photoBread, alt: "Sourdough", bottom: "12%", left: "3%", w: 220, h: 180, rot: 7, dx: "10px", dy: "10px", delay: 0.2 },
  { src: photoPasta, alt: "Herb pasta", bottom: "8%", right: "4%", w: 230, h: 200, rot: -4, dx: "-8px", dy: "-12px", delay: 0.15 },
  { src: photoGreens, alt: "Fresh greens", top: "44%", left: "0%", w: 150, h: 150, rot: 10, dx: "8px", dy: "8px", delay: 0.25 },
  { src: photoEggs, alt: "Cracked eggs", top: "42%", right: "1%", w: 150, h: 150, rot: -8, dx: "-6px", dy: "-8px", delay: 0.3 },
];

type Pill = {
  icon: string;
  label: string;
  tone: "tomato" | "amber" | "sage" | "cream";
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  delay: number;
};

const pills: Pill[] = [
  { icon: tomato, label: "Tomato", tone: "tomato", top: "32%", left: "16%", delay: 0.4 },
  { icon: herbs, label: "Basil", tone: "sage", top: "20%", left: "26%", delay: 0.5 },
  { icon: lemon, label: "Lemon", tone: "amber", top: "26%", right: "20%", delay: 0.55 },
  { icon: avocado, label: "Avocado", tone: "sage", bottom: "30%", left: "20%", delay: 0.6 },
  { icon: eggs, label: "Eggs", tone: "cream", bottom: "22%", right: "22%", delay: 0.65 },
  { icon: bread, label: "Sourdough", tone: "amber", bottom: "38%", right: "16%", delay: 0.7 },
  { icon: pasta, label: "Pasta", tone: "cream", top: "62%", left: "12%", delay: 0.75 },
];

const toneStyles: Record<Pill["tone"], React.CSSProperties> = {
  tomato: {
    background: "linear-gradient(135deg, color-mix(in oklab, var(--tomato) 90%, white), color-mix(in oklab, var(--tomato) 70%, transparent))",
    color: "var(--primary-foreground)",
  },
  amber: {
    background: "linear-gradient(135deg, color-mix(in oklab, var(--amber) 92%, white), color-mix(in oklab, var(--amber) 75%, transparent))",
    color: "var(--ink)",
  },
  sage: {
    background: "linear-gradient(135deg, color-mix(in oklab, var(--sage) 90%, white), color-mix(in oklab, var(--sage) 70%, transparent))",
    color: "var(--ink)",
  },
  cream: {
    background: "linear-gradient(135deg, oklch(0.98 0.01 80), oklch(0.92 0.02 78))",
    color: "var(--ink)",
  },
};

export function FoodCollage({
  blurred,
  generating,
}: {
  blurred?: boolean;
  generating?: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 transition-all duration-700"
      style={{
        filter: blurred ? "blur(14px) saturate(0.92)" : "none",
        opacity: blurred ? 0.5 : 1,
      }}
      aria-hidden
    >
      {/* High-res food photo cards */}
      {photos.map((p, i) => {
        const driftX = generating ? (p.left ? -50 : p.right ? 50 : 0) : 0;
        const driftY = generating ? (p.top ? -30 : p.bottom ? 30 : 0) : 0;
        return (
          <motion.div
            key={`photo-${i}`}
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{
              opacity: 1,
              scale: generating ? 1.05 : 1,
              x: driftX,
              y: driftY,
            }}
            transition={{ delay: p.delay, duration: 1.4, ease: [0.22, 0.9, 0.3, 1] }}
            className="absolute"
            style={{
              top: p.top,
              bottom: p.bottom,
              left: p.left,
              right: p.right,
              width: p.w,
              height: p.h,
            }}
          >
            <div
              className="animate-float h-full w-full overflow-hidden rounded-[28px]"
              style={
                {
                  "--dx": p.dx,
                  "--dy": p.dy,
                  "--rot": `${p.rot}deg`,
                  animationDelay: `${i * 0.7}s`,
                  boxShadow:
                    "0 30px 60px -22px rgba(80,40,15,0.35), 0 10px 20px -10px rgba(80,40,15,0.25), inset 0 0 0 1px rgba(255,255,255,0.55)",
                  transform: `rotate(${p.rot}deg)`,
                } as React.CSSProperties
              }
            >
              <img
                src={p.src}
                alt={p.alt}
                width={p.w * 2}
                height={p.h * 2}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </motion.div>
        );
      })}

      {/* Ingredient pills */}
      {pills.map((p, i) => (
        <motion.div
          key={`pill-${i}`}
          initial={{ opacity: 0, scale: 0.7, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: p.delay, duration: 0.6, ease: [0.22, 0.9, 0.3, 1] }}
          className="absolute"
          style={{ top: p.top, bottom: p.bottom, left: p.left, right: p.right }}
        >
          <div
            className="animate-float flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 backdrop-blur-md"
            style={{
              ...toneStyles[p.tone],
              animationDelay: `${i * 0.5 + 0.3}s`,
              boxShadow:
                "0 14px 30px -12px rgba(80,40,15,0.32), inset 0 0 0 1px rgba(255,255,255,0.35)",
            }}
          >
            <span
              className="grid h-9 w-9 place-items-center rounded-full"
              style={{
                background: "rgba(255,255,255,0.55)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
              }}
            >
              <img
                src={p.icon}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </span>
            <span className="text-[13px] font-semibold tracking-tight" style={{ letterSpacing: "-0.005em" }}>
              {p.label}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
