// GameCanvas_v12.jsx
import React, { useRef, useEffect, useState } from "react";
import nipplejs from "nipplejs";

const GameCanvas_v12 = () => {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const [found, setFound] = useState(false);
  const [hiderVisible, setHiderVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight * 0.9,
  });

  const speed = 2.4;
  const seekerSpeed = 2;
  const radius = 15;
  const fovAngle = Math.PI / 4;
  const visionRange = 150;
  const padding = 50;

  // Generate obstacles once
  const generateObstacles = (count, canvasWidth, canvasHeight) => {
    const obstacles = [];
    const minLength = 100;
    const maxLength = 250;
    const thickness = 10;
    const minDistance = 50;

    const isFarEnough = (newObs) => {
      return obstacles.every((obs) => {
        const sameOrientation =
          (obs.w > obs.h && newObs.w > newObs.h) ||
          (obs.h > obs.w && newObs.h > newObs.w);
        if (!sameOrientation) return true;
        const dx = Math.max(obs.x - (newObs.x + newObs.w), newObs.x - (obs.x + obs.w), 0);
        const dy = Math.max(obs.y - (newObs.y + newObs.h), newObs.y - (obs.y + obs.h), 0);
        return dx + dy >= minDistance;
      });
    };

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 50) {
        const isHorizontal = Math.random() < 0.5;
        let w, h;
        if (isHorizontal) {
          w = Math.floor(Math.random() * (maxLength - minLength)) + minLength;
          h = thickness;
        } else {
          w = thickness;
          h = Math.floor(Math.random() * (maxLength - minLength)) + minLength;
        }

        const x = Math.floor(Math.random() * (canvasWidth - w - padding * 2)) + padding;
        const y = Math.floor(Math.random() * (canvasHeight - h - padding * 2)) + padding;
        const newObs = { x, y, w, h };

        if (isFarEnough(newObs)) {
          obstacles.push(newObs);
          break;
        }
        attempts++;
      }
    }
    return obstacles;
  };

  const obstaclesRef = useRef(generateObstacles(12, dimensions.width, dimensions.height));

  // Helper: generate safe spawn position (not inside obstacle or walls)
  const getSafeSpawn = (radius, width, height, obstacles) => {
    let tries = 0;
    while (tries < 1000) {
      const x = Math.random() * (width - 2 * radius) + radius;
      const y = Math.random() * (height - 2 * radius) + radius;

      const collides = obstacles.some(
        (obs) =>
          x + radius > obs.x &&
          x - radius < obs.x + obs.w &&
          y + radius > obs.y &&
          y - radius < obs.y + obs.h
      );

      if (!collides) return { x, y };
      tries++;
    }
    return { x: width / 2, y: height / 2 };
  };

  // Safe spawn points
  const safeHider = getSafeSpawn(radius, dimensions.width, dimensions.height, obstaclesRef.current);
  const safeSeeker = getSafeSpawn(radius, dimensions.width, dimensions.height, obstaclesRef.current);

  const hiderRef = useRef(safeHider);
  const seekerRef = useRef({ ...safeSeeker, angle: 0, dx: 1, dy: 1 });

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight * 0.9,
      });
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard controls
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

  // Joystick (mobile)
  useEffect(() => {
    if (!isMobile) return;
    const joystickZone = document.getElementById("joystick");
    const manager = nipplejs.create({
      zone: joystickZone,
      mode: "static",
      position: { left: "80px", bottom: "100px" },
      color: "white",
    });

    manager.on("move", (_, data) => {
      const angle = data.angle?.radian || 0;
      keysRef.current = {
        ArrowUp: Math.abs(Math.sin(angle)) > 0.7 && angle < Math.PI,
        ArrowDown: Math.abs(Math.sin(angle)) > 0.7 && angle > Math.PI,
        ArrowLeft:
          Math.abs(Math.cos(angle)) > 0.7 &&
          (angle > Math.PI / 2 && angle < (3 * Math.PI) / 2),
        ArrowRight:
          Math.abs(Math.cos(angle)) > 0.7 &&
          (angle < Math.PI / 2 || angle > (3 * Math.PI) / 2),
      };
    });

    manager.on("end", () => (keysRef.current = {}));

    return () => manager.destroy();
  }, [isMobile]);

  // Collision detection
  const checkObstacleCollision = (x, y) => {
    for (const obs of obstaclesRef.current) {
      if (
        x + radius > obs.x &&
        x - radius < obs.x + obs.w &&
        y + radius > obs.y &&
        y - radius < obs.y + obs.h
      )
        return true;
    }
    return false;
  };

  // Line of sight
  const hasLineOfSight = (x1, y1, x2, y2) => {
    for (const obs of obstaclesRef.current) {
      if (lineIntersectsRect(x1, y1, x2, y2, obs)) return false;
    }
    return true;
  };

  const lineIntersectsRect = (x1, y1, x2, y2, rect) => {
    const lines = [
      [rect.x, rect.y, rect.x + rect.w, rect.y],
      [rect.x, rect.y, rect.x, rect.y + rect.h],
      [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
      [rect.x, rect.y + rect.h, rect.x + rect.w, rect.y + rect.h],
    ];
    for (const [x3, y3, x4, y4] of lines) {
      if (segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) return true;
    }
    return false;
  };

  const segmentsIntersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    return (
      ccw({ x: x1, y: y1 }, { x: x3, y: y3 }, { x: x4, y: y4 }) !==
      ccw({ x: x2, y: y2 }, { x: x3, y: y3 }, { x: x4, y: y4 }) &&
      ccw({ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }) !==
      ccw({ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x4, y: y4 })
    );
  };

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let patrolTimer = 0;
    let anim;

    const update = () => {
      if (!found) {
        // Hider movement
        let { x, y } = hiderRef.current;
        let dx = 0,
          dy = 0;
        if (keysRef.current["ArrowUp"]) dy -= 1;
        if (keysRef.current["ArrowDown"]) dy += 1;
        if (keysRef.current["ArrowLeft"]) dx -= 1;
        if (keysRef.current["ArrowRight"]) dx += 1;

        if (dx || dy) {
          const len = Math.sqrt(dx * dx + dy * dy);
          dx /= len;
          dy /= len;
        }

        const nextX = x + dx * speed;
        const nextY = y + dy * speed;

        if (
          nextX - radius > 0 &&
          nextX + radius < dimensions.width &&
          nextY - radius > 0 &&
          nextY + radius < dimensions.height &&
          !checkObstacleCollision(nextX, nextY)
        ) {
          hiderRef.current = { x: nextX, y: nextY };
        }

        // Seeker logic
        const seeker = seekerRef.current;
        const toHiderX = hiderRef.current.x - seeker.x;
        const toHiderY = hiderRef.current.y - seeker.y;
        const distance = Math.sqrt(toHiderX ** 2 + toHiderY ** 2);
        const dirX = toHiderX / distance;
        const dirY = toHiderY / distance;

        const seekerDirX = Math.cos(seeker.angle);
        const seekerDirY = Math.sin(seeker.angle);
        const dot = seekerDirX * dirX + seekerDirY * dirY;
        const angleToHider = Math.acos(dot);

        const inCone = distance < visionRange && angleToHider < fovAngle / 2;
        const canSee =
          inCone && hasLineOfSight(seeker.x, seeker.y, hiderRef.current.x, hiderRef.current.y);

        if (canSee) {
          setHiderVisible(true);
          seeker.x += dirX * seekerSpeed;
          seeker.y += dirY * seekerSpeed;
          seeker.angle = Math.atan2(toHiderY, toHiderX);
        } else {
          setHiderVisible(false);
          patrolTimer--;
          if (patrolTimer <= 0) {
            seeker.dx = Math.cos(Math.random() * Math.PI * 2);
            seeker.dy = Math.sin(Math.random() * Math.PI * 2);
            seeker.angle = Math.atan2(seeker.dy, seeker.dx);
            patrolTimer = 100 + Math.random() * 100;
          }
          let nextSX = seeker.x + seeker.dx * seekerSpeed;
          let nextSY = seeker.y + seeker.dy * seekerSpeed;
          if (
            nextSX - radius < 0 ||
            nextSX + radius > dimensions.width ||
            nextSY - radius < 0 ||
            nextSY + radius > dimensions.height ||
            checkObstacleCollision(nextSX, nextSY)
          ) {
            seeker.angle += Math.PI / 2;
            seeker.dx = Math.cos(seeker.angle);
            seeker.dy = Math.sin(seeker.angle);
          } else {
            seeker.x = nextSX;
            seeker.y = nextSY;
          }
        }

        if (distance < radius * 2) setFound(true);
      }

      // Draw
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Obstacles
      ctx.fillStyle = "gray";
      obstaclesRef.current.forEach((obs) => ctx.fillRect(obs.x, obs.y, obs.w, obs.h));

      const hider = hiderRef.current;
      const seeker = seekerRef.current;

      // Vision cone
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
      ctx.fillStyle = hiderVisible
        ? "rgba(255,0,0,0.25)"
        : "rgba(0,0,255,0.15)";
      ctx.fill();

      // Hider
      ctx.beginPath();
      ctx.arc(hider.x, hider.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = hiderVisible ? "red" : "cyan";
      ctx.fill();

      // Seeker
      ctx.beginPath();
      ctx.arc(seeker.x, seeker.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "orange";
      ctx.fill();

      if (found) {
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER!", dimensions.width / 2, dimensions.height / 2);
      }

      if (!found) anim = requestAnimationFrame(update);
    };
    update();

    return () => cancelAnimationFrame(anim);
  }, [dimensions, found]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          display: "block",
          background: "black",
          border: "2px solid #333",
          width: "100%",
        }}
      />
      {isMobile && (
        <div
          id="joystick"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "150px",
            height: "150px",
          }}
        />
      )}
    </>
  );
};

export default GameCanvas_v12;
