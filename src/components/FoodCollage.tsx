import { motion } from "motion/react";
import avocado from "@/assets/food-avocado.png";
import lemon from "@/assets/food-lemon.png";
import tomato from "@/assets/food-tomato.png";
import pasta from "@/assets/food-pasta.png";
import herbs from "@/assets/food-herbs.png";
import eggs from "@/assets/food-eggs.png";
import bread from "@/assets/food-bread.png";

const items = [
  { src: avocado, alt: "Avocado", x: "-38%", y: "-22%", size: 140, dx: "10px", dy: "-14px", rot: -8 },
  { src: lemon, alt: "Lemon", x: "32%", y: "-30%", size: 120, dx: "-8px", dy: "12px", rot: 12 },
  { src: tomato, alt: "Tomatoes", x: "40%", y: "20%", size: 160, dx: "12px", dy: "-8px", rot: 6 },
  { src: pasta, alt: "Pasta", x: "-42%", y: "22%", size: 150, dx: "-10px", dy: "10px", rot: -4 },
  { src: herbs, alt: "Basil", x: "0%", y: "-42%", size: 110, dx: "6px", dy: "10px", rot: 5 },
  { src: bread, alt: "Bread", x: "0%", y: "40%", size: 140, dx: "-10px", dy: "-12px", rot: -3 },
  { src: eggs, alt: "Eggs", x: "-30%", y: "0%", size: 95, dx: "8px", dy: "8px", rot: 10 },
];

export function FoodCollage({ blurred }: { blurred?: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 transition-all duration-700"
      style={{
        filter: blurred ? "blur(18px) saturate(0.9)" : "none",
        opacity: blurred ? 0.45 : 1,
      }}
      aria-hidden
    >
      {items.map((it, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + i * 0.08, duration: 0.7, ease: [0.22, 0.9, 0.3, 1] }}
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(calc(-50% + ${it.x}), calc(-50% + ${it.y}))`,
          }}
        >
          <div
            className="animate-float"
            style={
              {
                "--dx": it.dx,
                "--dy": it.dy,
                "--rot": `${it.rot}deg`,
                animationDelay: `${i * 0.6}s`,
                width: it.size,
                height: it.size,
                filter:
                  "drop-shadow(0 30px 40px rgba(0,0,0,0.55)) drop-shadow(0 0 30px rgba(212,168,83,0.18))",
              } as React.CSSProperties
            }
          >
            <img
              src={it.src}
              alt={it.alt}
              width={it.size}
              height={it.size}
              loading="lazy"
              className="h-full w-full object-contain"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
