import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface KineticTextProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}

export default function KineticText({
  text,
  className = "",
  as: Tag = "h2",
}: KineticTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chars = container.querySelectorAll(".kinetic-char");

    gsap.set(chars, { willChange: "transform" });

    gsap.fromTo(
      chars,
      {
        scaleY: 0.1,
        scaleX: 1.8,
        y: "-100%",
        opacity: 0,
      },
      {
        ease: "back.out(1.2)",
        duration: 0.8,
        startAt: { opacity: 0, y: "100%", scaleY: 2, scaleX: 0.3 },
        opacity: 1,
        y: "0%",
        scaleY: 1,
        scaleX: 1,
        yPercent: 0,
        stagger: 0.03,
        scrollTrigger: {
          trigger: container,
          start: "top 85%",
          toggleActions: "play none none none",
          onEnter: () => gsap.set(container, { perspective: 1000 }),
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.vars.trigger === container) t.kill();
      });
    };
  }, []);

  const words = text.split(" ");

  return (
    <div ref={containerRef} className={`kinetic-title ${className}`}>
      <Tag className="inline">
        {words.map((word, wi) => (
          <span key={wi} className="inline-block mr-[0.25em]">
            {word.split("").map((char, ci) => (
              <span
                key={ci}
                className="kinetic-char inline-block"
                style={{ opacity: 0 }}
              >
                {char}
              </span>
            ))}
          </span>
        ))}
      </Tag>
    </div>
  );
}
