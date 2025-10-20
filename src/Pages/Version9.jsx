import React, { useRef, useEffect, useState } from "react";

const GameCanvas_v9 = ({ initialWidth = 800, initialHeight = 600 }) => {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const hiderRef = useRef({ x: 100, y: 100 });
  const seekerRef = useRef({ x: 400, y: 300, angle: 0, dx: 1, dy: 1 });

  const [found, setFound] = useState(false);
  const [hiderVisible, setHiderVisible] = useState(false);

  const speed = 2.4;
  const seekerSpeed = 1.5;
  const radius = 20;
  const fovAngle = Math.PI / 4;
  const visionRange = 150;

  const obstaclesRef = useRef([]);
  const sizeRef = useRef({ w: initialWidth, h: initialHeight });

  // -------------------------
  // generateObstacles (same as v8)
  // -------------------------
  const generateObstacles = (canvasWidth, canvasHeight, options = {}) => {
    const {
      desiredCount = Math.max(6, Math.floor((canvasWidth + canvasHeight) / 200)),
      minLenFactor = 0.12,
      maxLenFactor = 0.35,
      thickness = 8,
      minGapFactor = 0.08,
      padding = 30,
      reservedZones = [],
      maxAttemptsMultiplier = 60,
    } = options;

    const obstacles = [];
    const minLength = Math.floor(Math.min(canvasWidth, canvasHeight) * minLenFactor);
    const maxLength = Math.floor(Math.min(canvasWidth, canvasHeight) * maxLenFactor);
    const minGap = Math.floor(Math.min(canvasWidth, canvasHeight) * minGapFactor);

    const bboxDistance = (a, b) => {
      const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
      const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
      return Math.sqrt(dx * dx + dy * dy);
    };

    const overlapsReserved = (rect) => {
      for (const r of reservedZones) {
        if (
          rect.x < r.x + r.w &&
          rect.x + rect.w > r.x &&
          rect.y < r.y + r.h &&
          rect.y + rect.h > r.y
        ) return true;
      }
      return false;
    };

    let attempts = 0;
    const maxAttempts = desiredCount * maxAttemptsMultiplier;
    while (obstacles.length < desiredCount && attempts < maxAttempts) {
      attempts++;
      const isHorizontal = Math.random() < 0.5;
      const w = isHorizontal
        ? Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength
        : thickness;
      const h = isHorizontal
        ? thickness
        : Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
      const x = Math.floor(Math.random() * (canvasWidth - w - padding * 2)) + padding;
      const y = Math.floor(Math.random() * (canvasHeight - h - padding * 2)) + padding;
      const newObs = { x, y, w, h };
      if (overlapsReserved(newObs)) continue;

      let ok = true;
      for (const obs of obstacles) {
        const overlap =
          newObs.x < obs.x + obs.w &&
          newObs.x + newObs.w > obs.x &&
          newObs.y < obs.y + obs.h &&
          newObs.y + newObs.h > obs.y;
        if (overlap) {
          ok = false;
          break;
        }
        const sameOrientation = (obs.w > obs.h) === (newObs.w > newObs.h);
        if (sameOrientation) {
          const dist = bboxDistance(obs, newObs);
          if (dist < minGap) {
            ok = false;
            break;
          }
        }
      }
      if (ok) obstacles.push(newObs);
    }
    return obstacles;
  };

  // -------------------------
  // check collision
  // -------------------------
  const checkObstacleCollision = (x, y, optionalRadius = radius) => {
    for (const obs of obstaclesRef.current) {
      if (
        x + optionalRadius > obs.x &&
        x - optionalRadius < obs.x + obs.w &&
        y + optionalRadius > obs.y &&
        y - optionalRadius < obs.y + obs.h
      ) return true;
    }
    return false;
  };

  // -------------------------
  // keyboard handling
  // -------------------------
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

  // -------------------------
  // setup canvas & obstacles
  // -------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeAndGenerate = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(200, Math.floor(rect.width));
      const h = Math.max(200, Math.floor(rect.height));
      canvas.width = w;
      canvas.height = h;
      sizeRef.current = { w, h };

      const spawnPadding = 80;
      hiderRef.current.x = Math.max(30, Math.min(hiderRef.current.x, w - 30));
      hiderRef.current.y = Math.max(30, Math.min(hiderRef.current.y, h - 30));
      seekerRef.current.x = Math.max(30, Math.min(seekerRef.current.x, w - 30));
      seekerRef.current.y = Math.max(30, Math.min(seekerRef.current.y, h - 30));

      const hiderZone = { x: 20, y: 20, w: spawnPadding, h: spawnPadding };
      const seekerZone = { x: w - spawnPadding - 20, y: h - spawnPadding - 20, w: spawnPadding, h: spawnPadding };

      obstaclesRef.current = generateObstacles(w, h, {
        desiredCount: Math.max(6, Math.floor((w + h) / 120)),
        padding: Math.max(20, Math.floor(Math.min(w, h) * 0.06)),
        reservedZones: [hiderZone, seekerZone],
      });
    };

    resizeAndGenerate();
    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => resizeAndGenerate(), 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // -------------------------
  // MAIN LOOP
  // -------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let patrolTimer = 1;

    const update = () => {
      if (!found) {
        // --- hider movement ---
        let { x, y } = hiderRef.current;
        let dx = 0, dy = 0;
        if (keysRef.current["ArrowUp"]) dy -= 1;
        if (keysRef.current["ArrowDown"]) dy += 1;
        if (keysRef.current["ArrowLeft"]) dx -= 1;
        if (keysRef.current["ArrowRight"]) dx += 1;
        if (dx || dy) {
          const len = Math.sqrt(dx*dx + dy*dy);
          dx /= len; dy /= len;
        }
        const nextX = x + dx*speed;
        const nextY = y + dy*speed;
        if (
          nextX - radius > 0 &&
          nextX + radius < canvas.width &&
          nextY - radius > 0 &&
          nextY + radius < canvas.height &&
          !checkObstacleCollision(nextX, nextY)
        ) { x = nextX; y = nextY; }
        hiderRef.current = { x, y };

        // --- seeker smart logic ---
        const seeker = seekerRef.current;
        const toHiderX = x - seeker.x;
        const toHiderY = y - seeker.y;
        const distance = Math.sqrt(toHiderX**2 + toHiderY**2) || 0.0001;
        const dirX = toHiderX / distance;
        const dirY = toHiderY / distance;

        const seekerDirX = Math.cos(seeker.angle);
        const seekerDirY = Math.sin(seeker.angle);
        const dot = seekerDirX * dirX + seekerDirY * dirY;
        const angleToHider = Math.acos(Math.max(-1, Math.min(1, dot)));
        const inCone = distance < visionRange && angleToHider < fovAngle/2;

        const willCollide = (sx, sy, ang, dist = 25) => {
          const checkX = sx + Math.cos(ang) * dist;
          const checkY = sy + Math.sin(ang) * dist;
          return checkObstacleCollision(checkX, checkY);
        };

        if (inCone) {
          setHiderVisible(true);
          seeker.angle = Math.atan2(toHiderY, toHiderX);

          if (willCollide(seeker.x, seeker.y, seeker.angle)) {
            seeker.angle += (Math.random()>0.5?1:-1) * Math.PI/12; // curve 15°
          }

          seeker.x += Math.cos(seeker.angle) * seekerSpeed;
          seeker.y += Math.sin(seeker.angle) * seekerSpeed;
        } else {
          setHiderVisible(false);
          patrolTimer--;
          if (patrolTimer <= 0) {
            let newAngle = Math.random()*Math.PI*2;
            let attempts = 0;
            while (willCollide(seeker.x, seeker.y, newAngle) && attempts<12) {
              newAngle += (Math.random()>0.5?1:-1) * Math.PI/12;
              attempts++;
            }
            seeker.dx = Math.cos(newAngle);
            seeker.dy = Math.sin(newAngle);
            seeker.angle = newAngle;
            patrolTimer = 100 + Math.random()*80;
          }

          let nextSX = seeker.x + Math.cos(seeker.angle) * seekerSpeed;
          let nextSY = seeker.y + Math.sin(seeker.angle) * seekerSpeed;
          let curveAttempts = 0;
          while (
            (nextSX - radius < 0 || nextSX + radius > canvas.width ||
             nextSY - radius < 0 || nextSY + radius > canvas.height ||
             checkObstacleCollision(nextSX, nextSY)) && curveAttempts<12
          ) {
            seeker.angle += (Math.random()>0.5?1:-1)*Math.PI/12;
            nextSX = seeker.x + Math.cos(seeker.angle) * seekerSpeed;
            nextSY = seeker.y + Math.sin(seeker.angle) * seekerSpeed;
            curveAttempts++;
          }
          seeker.dx = Math.cos(seeker.angle);
          seeker.dy = Math.sin(seeker.angle);
          seeker.x = nextSX;
          seeker.y = nextSY;
        }

        if (distance < radius*2) setFound(true);
      }

      // --- draw ---
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "gray";
      obstaclesRef.current.forEach(obs => ctx.fillRect(obs.x, obs.y, obs.w, obs.h));

      const hider = hiderRef.current;
      const seeker = seekerRef.current;

      ctx.beginPath();
      ctx.moveTo(seeker.x, seeker.y);
      ctx.arc(seeker.x, seeker.y, visionRange, seeker.angle - fovAngle/2, seeker.angle + fovAngle/2);
      ctx.closePath();
      ctx.fillStyle = hiderVisible ? "rgba(255,0,0,0.25)" : "rgba(0,0,255,0.15)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(hider.x, hider.y, radius, 0, Math.PI*2);
      ctx.fillStyle = hiderVisible ? "red" : "cyan";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(seeker.x, seeker.y, radius, 0, Math.PI*2);
      ctx.fillStyle = "orange";
      ctx.fill();

      if (found) {
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("FOUND!", w/2, h/2);
      }

      requestAnimationFrame(update);
    };
    update();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "93vh", display: "block", background: "black", border: "2px solid #333" }}
    />
  );
};

export default GameCanvas_v9;
