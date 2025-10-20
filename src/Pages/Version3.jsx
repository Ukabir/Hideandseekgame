import React, { useRef, useEffect } from "react";

const GameCanvas_v3 = ({ width, height }) => {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const hiderRef = useRef({ x: 100, y: 100 });
  const seekerRef = useRef({ x: 300, y: 200, dx: 2, dy: 2 });
  const speed = 2.5;
  const radius = 20;
  const seekerSpeed = 1.8;

  // ✅ Handle key press and release
  useEffect(() => {
    const handleKeyDown = (e) => (keysRef.current[e.key] = true);
    const handleKeyUp = (e) => (keysRef.current[e.key] = false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // ✅ Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const update = () => {
      // --- HIDER MOVEMENT (you) ---
      let { x, y } = hiderRef.current;
      let dx = 0,
        dy = 0;

      if (keysRef.current["ArrowUp"]) dy -= 1;
      if (keysRef.current["ArrowDown"]) dy += 1;
      if (keysRef.current["ArrowLeft"]) dx -= 1;
      if (keysRef.current["ArrowRight"]) dx += 1;

      // Normalize diagonal speed
      if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
      }

      x += dx * speed;
      y += dy * speed;

      // Keep inside bounds
      x = Math.max(radius, Math.min(width - radius, x));
      y = Math.max(radius, Math.min(height - radius, y));

      hiderRef.current = { x, y };

      // --- SEEKER MOVEMENT ---
      let seeker = seekerRef.current;
      seeker.x += seeker.dx * seekerSpeed;
      seeker.y += seeker.dy * seekerSpeed;

      // Bounce off walls
      if (seeker.x - radius < 0 || seeker.x + radius > width) {
        seeker.dx *= -1;
      }
      if (seeker.y - radius < 0 || seeker.y + radius > height) {
        seeker.dy *= -1;
      }

      seekerRef.current = seeker;

      // --- DRAW ---
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      // draw hider (red)
      ctx.beginPath();
      ctx.arc(hiderRef.current.x, hiderRef.current.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();

      // draw seeker (blue)
      ctx.beginPath();
      ctx.arc(seeker.x, seeker.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "blue";
      ctx.fill();

      requestAnimationFrame(update);
    };

    update();
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: "block",
        background: "black",
        border: "2px solid #333",
      }}
    />
  );
};

export default GameCanvas_v3;
