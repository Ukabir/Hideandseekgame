import React, { useRef, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";

const GameCanvas_v11 = ({ initialWidth = 800, initialHeight = 600 }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const hiderRef = useRef({ x: 100, y: 100 });
  const seekerRef = useRef({ x: 400, y: 300, angle: 0, dx: 1, dy: 1 });
  const trailRef = useRef([]);

  const [found, setFound] = useState(false);
  const [hiderVisible, setHiderVisible] = useState(false);

  // refs to control loop & sync state
  const foundRef = useRef(false);
  const startedRef = useRef(false);
  const animRef = useRef(null);

  const speed = 2.3;
  const seekerSpeed = 1.8;
  const radius = 20;
  const fovAngle = Math.PI / 4;
  const visionRange = 150;

  const obstaclesRef = useRef([]);
  const sizeRef = useRef({ w: initialWidth, h: initialHeight });

  // ---- NEW: last-seen memory
  // lastSeenRef: { x, y } of last known hider position
  // lastSeenTimerRef: frames left to search this location
  const lastSeenRef = useRef(null);
  const lastSeenTimerRef = useRef(0);
  // how long seeker will pursue last-seen (frames)
  const LAST_SEEN_DURATION = 160;

  // ------------------------------
  // Helper: line-of-sight check
  // ------------------------------
  const canSeeHider = (sx, sy, hx, hy) => {
    const dx = hx - sx;
    const dy = hy - sy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(2, Math.ceil(distance / 4)); // check every ~4px
    for (let i = 0; i <= steps; i++) {
      const x = sx + (dx * i) / steps;
      const y = sy + (dy * i) / steps;
      if (checkObstacleCollision(x, y, 0)) return false; // blocked
    }
    return true;
  };

  // ------------------------------
  // Obstacles generator (unchanged)
  // ------------------------------
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
        if (rect.x < r.x + r.w && rect.x + rect.w > r.x && rect.y < r.y + r.h && rect.y + rect.h > r.y) {
          return true;
        }
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

  const checkObstacleCollision = (x, y, optionalRadius = radius) => {
    for (const obs of obstaclesRef.current) {
      if (
        x + optionalRadius > obs.x &&
        x - optionalRadius < obs.x + obs.w &&
        y + optionalRadius > obs.y &&
        y - optionalRadius < obs.y + obs.h
      ) {
        return true;
      }
    }
    return false;
  };

  // ------------------------------
  // Keyboard
  // ------------------------------
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

  // ------------------------------
  // Canvas + spawn + obstacles
  // ------------------------------
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

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

      // generate obstacles first (with edge reserved regions)
      const defaultReserved = [
        { x: 10, y: 10, w: spawnPadding + 10, h: spawnPadding + 10 },
        { x: w - spawnPadding - 20, y: h - spawnPadding - 20, w: spawnPadding + 10, h: spawnPadding + 10 },
      ];
      obstaclesRef.current = generateObstacles(w, h, {
        desiredCount: Math.max(6, Math.floor((w + h) / 120)),
        padding: Math.max(20, Math.floor(Math.min(w, h) * 0.06)),
        reservedZones: defaultReserved,
      });

      // choose safe spawn positions (ensures not inside obstacles)
      const getSafePosition = () => {
        let pos;
        let attempts = 0;
        do {
          pos = { x: Math.random() * (w - 60) + 30, y: Math.random() * (h - 60) + 30 };
          attempts++;
          if (attempts > 300) break;
        } while (checkObstacleCollision(pos.x, pos.y));
        return pos;
      };

      hiderRef.current = getSafePosition();
      seekerRef.current = getSafePosition();
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

  // ------------------------------
  // Main Loop (with last-seen pursuit)
  // ------------------------------
  useEffect(() => {
    if (animRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let patrolTimer = 1;

    const willCollide = (sx, sy, ang, dist = 25) => {
      const checkX = sx + Math.cos(ang) * dist;
      const checkY = sy + Math.sin(ang) * dist;
      return checkObstacleCollision(checkX, checkY);
    };

    // try small sidesteps by angles (degrees)
    const trySidestepAngles = [15, -15, 30, -30, 60, -60];

    const update = () => {
      if (foundRef.current) {
        // final draw and cancel RAF
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "gray";
        obstaclesRef.current.forEach((obs) => ctx.fillRect(obs.x, obs.y, obs.w, obs.h));

        // trail
        for (let i = 0; i < trailRef.current.length; i++) {
          const t = trailRef.current[i];
          ctx.beginPath();
          ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 0, ${i / trailRef.current.length})`;
          ctx.fill();
        }

        const hider = hiderRef.current;
        const seeker = seekerRef.current;

        ctx.beginPath();
        ctx.moveTo(seeker.x, seeker.y);
        ctx.arc(seeker.x, seeker.y, visionRange, seeker.angle - fovAngle / 2, seeker.angle + fovAngle / 2);
        ctx.closePath();
        ctx.fillStyle = hiderVisible ? "rgba(255,0,0,0.25)" : "rgba(0,0,255,0.15)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(hider.x, hider.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = hiderVisible ? "red" : "cyan";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(seeker.x, seeker.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "orange";
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER!", w / 2, h / 2);

        if (animRef.current) {
          cancelAnimationFrame(animRef.current);
          animRef.current = null;
        }
        return;
      }

      // --- HIDER input & movement ---
      let { x, y } = hiderRef.current;
      let dx = 0,
        dy = 0;
      if (keysRef.current["ArrowUp"]) dy -= 1;
      if (keysRef.current["ArrowDown"]) dy += 1;
      if (keysRef.current["ArrowLeft"]) dx -= 1;
      if (keysRef.current["ArrowRight"]) dx += 1;
      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }
      const nextX = x + dx * speed;
      const nextY = y + dy * speed;
      const w = canvas.width;
      const h = canvas.height;
      if (
        nextX - radius > 0 &&
        nextX + radius < w &&
        nextY - radius > 0 &&
        nextY + radius < h &&
        !checkObstacleCollision(nextX, nextY)
      ) {
        x = nextX;
        y = nextY;
      }
      hiderRef.current = { x, y };

      // --- SEEKER logic ---
      const seeker = seekerRef.current;
      const toHiderX = x - seeker.x;
      const toHiderY = y - seeker.y;
      let distance = Math.sqrt(toHiderX ** 2 + toHiderY ** 2) || 0.0001;
      const dirX = toHiderX / distance;
      const dirY = toHiderY / distance;

      const seekerDirX = Math.cos(seeker.angle);
      const seekerDirY = Math.sin(seeker.angle);
      const dot = seekerDirX * dirX + seekerDirY * dirY;
      const angleToHider = Math.acos(Math.max(-1, Math.min(1, dot)));

      // respect walls: must be in FOV, in range, and LOS unobstructed
      const inCone = distance < visionRange && angleToHider < fovAngle / 2 && canSeeHider(seeker.x, seeker.y, x, y);

      if (inCone) {
        // saw the hider: update last-seen, pursue directly
        setHiderVisible(true);
        lastSeenRef.current = { x, y };
        lastSeenTimerRef.current = LAST_SEEN_DURATION;

        seeker.angle = Math.atan2(toHiderY, toHiderX);

        // if obstacle in immediate path, try a tiny curve
        if (willCollide(seeker.x, seeker.y, seeker.angle)) {
          seeker.angle += (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 12); // ~15°
        }

        const nextSX = seeker.x + Math.cos(seeker.angle) * seekerSpeed;
        const nextSY = seeker.y + Math.sin(seeker.angle) * seekerSpeed;
        if (!checkObstacleCollision(nextSX, nextSY)) {
          seeker.x = nextSX;
          seeker.y = nextSY;
        } else {
          // when blocked while chasing, try small sidesteps (left/right) to get around
          let moved = false;
          for (const deg of trySidestepAngles) {
            const ang = seeker.angle + (deg * Math.PI) / 180;
            const tx = seeker.x + Math.cos(ang) * seekerSpeed;
            const ty = seeker.y + Math.sin(ang) * seekerSpeed;
            if (!checkObstacleCollision(tx, ty)) {
              seeker.x = tx;
              seeker.y = ty;
              seeker.angle = ang;
              moved = true;
              break;
            }
          }
          // if none worked, stay (will try again next frame)
        }
      } else if (lastSeenRef.current && lastSeenTimerRef.current > 0) {
        // If we recently saw the hider, move toward the last seen location (search behavior)
        setHiderVisible(false);
        lastSeenTimerRef.current -= 1;

        const target = lastSeenRef.current;
        const tx = target.x - seeker.x;
        const ty = target.y - seeker.y;
        const tdist = Math.sqrt(tx * tx + ty * ty) || 0.0001;
        let tang = Math.atan2(ty, tx);
        seeker.angle = tang;

        // if path to target blocked, try sidesteps / small angular offsets
        const nextSX = seeker.x + Math.cos(seeker.angle) * seekerSpeed;
        const nextSY = seeker.y + Math.sin(seeker.angle) * seekerSpeed;
        if (!checkObstacleCollision(nextSX, nextSY)) {
          seeker.x = nextSX;
          seeker.y = nextSY;
        } else {
          // attempt small angled detours (left/right, progressively larger)
          let moved = false;
          for (const deg of trySidestepAngles) {
            const ang = tang + (deg * Math.PI) / 180;
            const tx2 = seeker.x + Math.cos(ang) * seekerSpeed;
            const ty2 = seeker.y + Math.sin(ang) * seekerSpeed;
            if (!checkObstacleCollision(tx2, ty2)) {
              seeker.x = tx2;
              seeker.y = ty2;
              seeker.angle = ang;
              moved = true;
              break;
            }
          }
          // if we did not move, gently rotate (so next frame tries a different angle)
          if (!moved) seeker.angle += (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 18);
        }

        // if we've reached the last-seen location, clear it early
        if (tdist < 12) {
          lastSeenRef.current = null;
          lastSeenTimerRef.current = 0;
        }
      } else {
        // normal patrol (unchanged semantics, but obstacle-aware)
        setHiderVisible(false);
        patrolTimer--;
        if (patrolTimer <= 0) {
          let newAngle = Math.random() * Math.PI * 2;
          let safety = 0;
          while (willCollide(seeker.x, seeker.y, newAngle) && safety < 12) {
            newAngle = Math.random() * Math.PI * 2;
            safety++;
          }
          seeker.dx = Math.cos(newAngle);
          seeker.dy = Math.sin(newAngle);
          seeker.angle = newAngle;
          patrolTimer = 100 + Math.random() * 80;
        }

        const nextSX = seeker.x + seeker.dx * seekerSpeed;
        const nextSY = seeker.y + seeker.dy * seekerSpeed;
        if (
          checkObstacleCollision(nextSX, nextSY) ||
          nextSX - radius < 0 ||
          nextSX + radius > canvas.width ||
          nextSY - radius < 0 ||
          nextSY + radius > canvas.height
        ) {
          // instead of reversing, rotate slightly (so it doesn't oscillate)
          seeker.angle += (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 12);
          seeker.dx = Math.cos(seeker.angle);
          seeker.dy = Math.sin(seeker.angle);
        } else {
          seeker.x = nextSX;
          seeker.y = nextSY;
        }
      }

      // --- collision check for game over ---
      if (distance < radius * 2) {
        foundRef.current = true;
        setFound(true);
        // next frame will do final draw and cancel RAF
      }

      // --- trail record ---
      trailRef.current.push({ x: seeker.x, y: seeker.y });
      if (trailRef.current.length > 60) trailRef.current.shift();

      // --- DRAW ---
      const ww = canvas.width;
      const hh = canvas.height;
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, ww, hh);

      ctx.fillStyle = "gray";
      obstaclesRef.current.forEach((obs) => ctx.fillRect(obs.x, obs.y, obs.w, obs.h));

      // trail
      for (let i = 0; i < trailRef.current.length; i++) {
        const t = trailRef.current[i];
        ctx.beginPath();
        ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 0, ${i / trailRef.current.length})`;
        ctx.fill();
      }

      const hider = hiderRef.current;
      const seeker2 = seekerRef.current;

      ctx.beginPath();
      ctx.moveTo(seeker2.x, seeker2.y);
      ctx.arc(seeker2.x, seeker2.y, visionRange, seeker2.angle - fovAngle / 2, seeker2.angle + fovAngle / 2);
      ctx.closePath();
      ctx.fillStyle = hiderVisible ? "rgba(255,0,0,0.25)" : "rgba(0,0,255,0.15)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(hider.x, hider.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = hiderVisible ? "red" : "cyan";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(seeker2.x, seeker2.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "orange";
      ctx.fill();

      // schedule next frame
      animRef.current = requestAnimationFrame(update);
    };

    animRef.current = requestAnimationFrame(update);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, []); // run once

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "93vh", display: "block", background: "black", border: "2px solid #333" }}
      />
      <ToastContainer />
    </>
  );
};

export default GameCanvas_v11;
