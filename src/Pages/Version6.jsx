import React, { useRef, useEffect, useState } from "react";

const GameCanvas_v6 = ({ width, height }) => {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const hiderRef = useRef({ x: 100, y: 100 });
  const seekerRef = useRef({
    x: 400,
    y: 300,
    angle: 0,
    dx: 1,
    dy: 1,
  });

  const [found, setFound] = useState(false);
  const [alert, setAlert] = useState(false);

  const speed = 2.4;
  const seekerSpeed = 2;
  const radius = 20;
  const fovAngle = Math.PI / 3; // 60° field of view
  const visionRange = 200; // how far the seeker can see

  // ✅ Key press/release
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

    let patrolTimer = 0;

    const update = () => {
      if (!found) {
        // --- HIDER MOVEMENT ---
        let { x, y } = hiderRef.current;
        let dx = 0,
          dy = 0;

        if (keysRef.current["ArrowUp"]) dy -= 1;
        if (keysRef.current["ArrowDown"]) dy += 1;
        if (keysRef.current["ArrowLeft"]) dx -= 1;
        if (keysRef.current["ArrowRight"]) dx += 1;

        // Normalize diagonal
        if (dx !== 0 || dy !== 0) {
          const len = Math.sqrt(dx * dx + dy * dy);
          dx /= len;
          dy /= len;
        }

        x += dx * speed;
        y += dy * speed;
        x = Math.max(radius, Math.min(width - radius, x));
        y = Math.max(radius, Math.min(height - radius, y));
        hiderRef.current = { x, y };

        // --- SEEKER LOGIC ---
        const seeker = seekerRef.current;
        const toHiderX = x - seeker.x;
        const toHiderY = y - seeker.y;
        const distance = Math.sqrt(toHiderX ** 2 + toHiderY ** 2);

        // Normalize vector to hider
        const dirX = toHiderX / distance;
        const dirY = toHiderY / distance;

        // Seeker forward vector
        const seekerDirX = Math.cos(seeker.angle);
        const seekerDirY = Math.sin(seeker.angle);

        // Angle between seeker's facing direction and hider
        const dot = seekerDirX * dirX + seekerDirY * dirY;
        const angleToHider = Math.acos(dot);

        const canSeeHider =
          distance < visionRange && angleToHider < fovAngle / 2;

        if (canSeeHider) {
          setAlert(true);
          // Chase hider
          seeker.x += dirX * seekerSpeed;
          seeker.y += dirY * seekerSpeed;
          seeker.angle = Math.atan2(toHiderY, toHiderX);
        } else {
          setAlert(false);
          // Patrol randomly
          patrolTimer--;
          if (patrolTimer <= 0) {
            seeker.dx = (Math.random() - 0.5) * 2;
            seeker.dy = (Math.random() - 0.5) * 2;
            const len = Math.sqrt(seeker.dx ** 2 + seeker.dy ** 2);
            seeker.dx /= len;
            seeker.dy /= len;
            seeker.angle = Math.atan2(seeker.dy, seeker.dx);
            patrolTimer = 120 + Math.random() * 100; // change direction every few frames
          }
          seeker.x += seeker.dx * seekerSpeed;
          seeker.y += seeker.dy * seekerSpeed;

          // Bounce off walls
          if (seeker.x - radius < 0 || seeker.x + radius > width)
            seeker.dx *= -1;
          if (seeker.y - radius < 0 || seeker.y + radius > height)
            seeker.dy *= -1;
        }

        // --- COLLISION DETECTION ---
        if (distance < radius * 2) {
          setFound(true);
        }

        seekerRef.current = seeker;
      }

      // --- DRAW EVERYTHING ---
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      const hider = hiderRef.current;
      const seeker = seekerRef.current;

      // Seeker vision cone
      ctx.beginPath();
      ctx.moveTo(seeker.x, seeker.y);
      ctx.arc(
        seeker.x,
        seeker.y,
        visionRange,
        seeker.angle - fovAngle / 2,
        seeker.angle + fovAngle / 2
      );
      ctx.closePath();
      ctx.fillStyle = alert ? "rgba(255, 0, 0, 0.2)" : "rgba(0, 0, 255, 0.1)";
      ctx.fill();

      // Hider
      ctx.beginPath();
      ctx.arc(hider.x, hider.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();

      // Seeker
      ctx.beginPath();
      ctx.arc(seeker.x, seeker.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "blue";
      ctx.fill();

      // "FOUND" message
      if (found) {
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("FOUND!", width / 2, height / 2);
      }

      requestAnimationFrame(update);
    };

    update();
  }, [width, height, found]);

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

export default GameCanvas_v6;
