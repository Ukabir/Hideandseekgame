import React, { useRef, useEffect, useState } from "react";

const GameCanvas_v7 = ({ initialWidth = 800, initialHeight = 600 }) => {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const hiderRef = useRef({ x: 100, y: 100 });
  const seekerRef = useRef({ x: 400, y: 300, angle: 0, dx: 1, dy: 1 });

  const [found, setFound] = useState(false);
  const [hiderVisible, setHiderVisible] = useState(false);

  const speed = 2.4;
  const seekerSpeed = 2;
  const radius = 20;
  const fovAngle = Math.PI / 5; // 60° FOV
  const visionRange = 150;

  // obstacles stored in a ref so drawing loop doesn't trigger re-renders
  const obstaclesRef = useRef([]);

  // canvas size state (drives regeneration)
  const sizeRef = useRef({ w: initialWidth, h: initialHeight });

  // ------------------------------------------
  // Optimized generateObstacles with padding and reserved zones
  // ------------------------------------------
  const generateObstacles = (canvasWidth, canvasHeight, options = {}) => {
    const {
      desiredCount = Math.max(6, Math.floor((canvasWidth + canvasHeight) / 200)),
      minLenFactor = 0.12,
      maxLenFactor = 0.35,
      thickness = 8,
      minGapFactor = 0.08,
      padding = 30, // distance from canvas edges
      reservedZones = [], // array of {x,y,w,h} where obstacles must not spawn
      maxAttemptsMultiplier = 60,
    } = options;

    const obstacles = [];
    const minLength = Math.floor(Math.min(canvasWidth, canvasHeight) * minLenFactor);
    const maxLength = Math.floor(Math.min(canvasWidth, canvasHeight) * maxLenFactor);
    const minGap = Math.floor(Math.min(canvasWidth, canvasHeight) * minGapFactor);

    // bbox distance helper
    const bboxDistance = (a, b) => {
      const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
      const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
      return Math.sqrt(dx * dx + dy * dy);
    };

    const overlapsReserved = (rect) => {
      for (const r of reservedZones) {
        const overlap =
          rect.x < r.x + r.w && rect.x + rect.w > r.x && rect.y < r.y + r.h && rect.y + rect.h > r.y;
        if (overlap) return true;
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

      // position within padded area
      const x = Math.floor(Math.random() * (canvasWidth - w - padding * 2)) + padding;
      const y = Math.floor(Math.random() * (canvasHeight - h - padding * 2)) + padding;
      const newObs = { x, y, w, h };

      // don't spawn inside reserved zones (spawn areas for players)
      if (overlapsReserved(newObs)) continue;

      // check overlap & spacing
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
        // only enforce min gap for same orientation
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

  // ------------------------------------------
  // Utility: check collision with obstacles
  // ------------------------------------------
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

  // ------------------------------------------
  // Keyboard handling
  // ------------------------------------------
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

  // ------------------------------------------
  // Setup/responsive behavior: set canvas size and generate obstacles once per size change
  // ------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeAndGenerate = () => {
      // set canvas drawing buffer to match CSS size (100% x 90vh)
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(200, Math.floor(rect.width));
      const h = Math.max(200, Math.floor(rect.height));
      canvas.width = w;
      canvas.height = h;
      sizeRef.current = { w, h };

      // reserve spawn zones for both players (padding rectangles)
      const spawnPadding = 80;
      // hider near top-left, seeker near bottom-right by default
      hiderRef.current.x = Math.max(30, Math.min(hiderRef.current.x, w - 30));
      hiderRef.current.y = Math.max(30, Math.min(hiderRef.current.y, h - 30));
      seekerRef.current.x = Math.max(30, Math.min(seekerRef.current.x, w - 30));
      seekerRef.current.y = Math.max(30, Math.min(seekerRef.current.y, h - 30));

      const hiderZone = {
        x: Math.max(10, Math.min(hiderRef.current.x - spawnPadding / 2, w - spawnPadding - 10)),
        y: Math.max(10, Math.min(hiderRef.current.y - spawnPadding / 2, h - spawnPadding - 10)),
        w: spawnPadding,
        h: spawnPadding,
      };
      const seekerZone = {
        x: Math.max(10, Math.min(seekerRef.current.x - spawnPadding / 2, w - spawnPadding - 10)),
        y: Math.max(10, Math.min(seekerRef.current.y - spawnPadding / 2, h - spawnPadding - 10)),
        w: spawnPadding,
        h: spawnPadding,
      };

      // generate obstacles using padding and reserved zones
      obstaclesRef.current = generateObstacles(w, h, {
        desiredCount: Math.max(6, Math.floor((w + h) / 80)),
        padding: Math.max(20, Math.floor(Math.min(w, h) * 0.06)),
        reservedZones: [hiderZone, seekerZone],
      });
      
      // ensure seeker isn't inside obstacle — if it is, relocate seeker to nearest safe spot
      const ensureSeekerSafe = () => {
        if (!checkObstacleCollision(seekerRef.current.x, seekerRef.current.y)) return;

        const candidates = [
          { x: 30, y: 30 },
          { x: w - 30, y: 30 },
          { x: 30, y: h - 30 },
          { x: w - 30, y: h - 30 },
          { x: Math.floor(w / 2), y: Math.floor(h / 2) },
          { x: hiderRef.current.x + 60, y: hiderRef.current.y + 60 },
        ];

        for (const c of candidates) {
          if (!checkObstacleCollision(c.x, c.y)) {
            seekerRef.current.x = c.x;
            seekerRef.current.y = c.y;
            return;
          }
        }

        // spiral fallback
        const step = 12;
        let foundSafe = false;
        const s = { x: seekerRef.current.x, y: seekerRef.current.y };
        for (let r = step; r < Math.max(w, h) && !foundSafe; r += step) {
          for (let a = 0; a < Math.PI * 2 && !foundSafe; a += Math.PI / 8) {
            const cx = Math.floor(s.x + Math.cos(a) * r);
            const cy = Math.floor(s.y + Math.sin(a) * r);
            if (cx > 10 && cx < w - 10 && cy > 10 && cy < h - 10 && !checkObstacleCollision(cx, cy)) {
              seekerRef.current.x = cx;
              seekerRef.current.y = cy;
              foundSafe = true;
            }
          }
        }
      };
      ensureSeekerSafe();
    };

    // initialize
    resizeAndGenerate();

    // re-generate on window resize (debounced)
    let resizeTimer = null;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeAndGenerate();
      }, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
    };
    // NOTE: intentionally no dependency on `found` so obstacles don't regenerate when found toggles
  }, [/* only run once on mount or when width/height props change if you wire them */]);

  // ------------------------------------------
  // Main game loop (unchanged logic semantics)
  // ------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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

        if (dx !== 0 || dy !== 0) {
          const len = Math.sqrt(dx * dx + dy * dy);
          dx /= len;
          dy /= len;
        }

        const nextX = x + dx * speed;
        const nextY = y + dy * speed;

        // bounds check & obstacle collision
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

        // --- SEEKER LOGIC ---
        const seeker = seekerRef.current;
        const toHiderX = x - seeker.x;
        const toHiderY = y - seeker.y;
        const distance = Math.sqrt(toHiderX ** 2 + toHiderY ** 2) || 0.0001;

        const dirX = toHiderX / distance;
        const dirY = toHiderY / distance;

        const seekerDirX = Math.cos(seeker.angle);
        const seekerDirY = Math.sin(seeker.angle);

        const dot = seekerDirX * dirX + seekerDirY * dirY;
        const angleToHider = Math.acos(Math.max(-1, Math.min(1, dot)));

        const inCone = distance < visionRange && angleToHider < fovAngle / 2;

        if (inCone) {
          setHiderVisible(true);
          let nextSX = seeker.x + dirX * seekerSpeed;
          let nextSY = seeker.y + dirY * seekerSpeed;
          if (!checkObstacleCollision(nextSX, nextSY)) {
            seeker.x = nextSX;
            seeker.y = nextSY;
          } else {
            // try side steps to avoid blocking while chasing
            const sidestep = 12;
            const try1x = seeker.x + -dirY * sidestep;
            const try1y = seeker.y + dirX * sidestep;
            const try2x = seeker.x + dirY * sidestep;
            const try2y = seeker.y - dirX * sidestep;
            if (!checkObstacleCollision(try1x, try1y)) {
              seeker.x = try1x;
              seeker.y = try1y;
            } else if (!checkObstacleCollision(try2x, try2y)) {
              seeker.x = try2x;
              seeker.y = try2y;
            }
          }
          seeker.angle = Math.atan2(toHiderY, toHiderX);
        } else {
          setHiderVisible(false);

          // PATROL MODE
          patrolTimer--;
          if (patrolTimer <= 0) {
            seeker.dx = (Math.random() - 0.5) * 2;
            seeker.dy = (Math.random() - 0.5) * 2;
            const len = Math.sqrt(seeker.dx ** 2 + seeker.dy ** 2) || 1;
            seeker.dx /= len;
            seeker.dy /= len;
            seeker.angle = Math.atan2(seeker.dy, seeker.dx);
            patrolTimer = 120 + Math.random() * 100;
          }

          let nextSX = seeker.x + seeker.dx * seekerSpeed;
          let nextSY = seeker.y + seeker.dy * seekerSpeed;
          if (
            nextSX - radius < 0 ||
            nextSX + radius > w ||
            nextSY - radius < 0 ||
            nextSY + radius > h ||
            checkObstacleCollision(nextSX, nextSY)
          ) {
            seeker.dx *= -1;
            seeker.dy *= -1;
            seeker.angle = Math.atan2(seeker.dy, seeker.dx);
            // slight reposition attempt
            const tryX = seeker.x + seeker.dx * seekerSpeed * 2;
            const tryY = seeker.y + seeker.dy * seekerSpeed * 2;
            if (!checkObstacleCollision(tryX, tryY)) {
              seeker.x = tryX;
              seeker.y = tryY;
            }
          } else {
            seeker.x = nextSX;
            seeker.y = nextSY;
          }
        }

        if (distance < radius * 2) setFound(true);
      }

      // DRAW
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, w, h);

      // obstacles
      ctx.fillStyle = "gray";
      obstaclesRef.current.forEach((obs) => ctx.fillRect(obs.x, obs.y, obs.w, obs.h));

      const hider = hiderRef.current;
      const seeker = seekerRef.current;

      // FOV cone
      ctx.beginPath();
      ctx.moveTo(seeker.x, seeker.y);
      ctx.arc(seeker.x, seeker.y, visionRange, seeker.angle - fovAngle / 2, seeker.angle + fovAngle / 2);
      ctx.closePath();
      ctx.fillStyle = hiderVisible ? "rgba(255,0,0,0.25)" : "rgba(0,0,255,0.15)";
      ctx.fill();

      // hider
      ctx.beginPath();
      ctx.arc(hider.x, hider.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = hiderVisible ? "red" : "cyan";
      ctx.fill();

      // seeker
      ctx.beginPath();
      ctx.arc(seeker.x, seeker.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "orange";
      ctx.fill();

      if (found) {
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("FOUND!", w / 2, h / 2);
      }

      requestAnimationFrame(update);
    };

    update();

    // we intentionally don't add `found` as a dependency to avoid regenerating obstacles on found change
  }, [/* empty: main effect uses internal obstaclesRef generated above */]);

  // RENDER canvas with responsive CSS: 100% width and 90vh height
  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "93vh", display: "block", background: "black", border: "2px solid #333" }}
    />
  );
};

export default GameCanvas_v7;
