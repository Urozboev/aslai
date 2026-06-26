import { useRef, useEffect } from "react";

const COLS = 40;

interface Dot {
  x: number;
  y: number;
  r: number;
  baseR: number;
  col: number;
  row: number;
}

export default function DotGridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const time = { current: 0 };
    const dots: Dot[] = [];

    for (
      let i = 0;
      i < Math.ceil(window.innerWidth / COLS);
      i++
    ) {
      for (
        let j = 0;
        j < Math.ceil(window.innerHeight / COLS);
        j++
      ) {
        dots.push({
          x: i * COLS,
          y: j * COLS,
          r: 1.5,
          baseR: 1.5,
          col: i,
          row: j,
        });
      }
    }

    function animate() {
      if (!ctx) return;
      time.current += 0.01;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      dots.forEach((dot) => {
        dot.r =
          dot.baseR +
          Math.sin(time.current + dot.col * 0.2 + dot.row * 0.2) * 1;

        const color =
          Math.sin(time.current + dot.col * 0.1) > 0.5
            ? "rgba(14, 165, 164, 0.3)"
            : "rgba(255, 255, 255, 0.05)";

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none"
    />
  );
}
