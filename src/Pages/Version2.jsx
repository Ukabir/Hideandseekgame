import React, { useRef, useEffect, useState } from "react";

// const GameCanvas_v2 = ({ width, height }) => {
//   const canvasRef = useRef(null);
//   const keysRef = useRef({});
//   const posRef = useRef({ x: 100, y: 100 });
//   const [renderTrigger, setRenderTrigger] = useState(0); // to force redraws
//   const speed = 4;
//   const radius = 20;

//   // ✅ Handle key press and release
//   useEffect(() => {
//     const handleKeyDown = (e) => (keysRef.current[e.key] = true);
//     const handleKeyUp = (e) => (keysRef.current[e.key] = false);

//     window.addEventListener("keydown", handleKeyDown);
//     window.addEventListener("keyup", handleKeyUp);

//     return () => {
//       window.removeEventListener("keydown", handleKeyDown);
//       window.removeEventListener("keyup", handleKeyUp);
//     };
//   }, []);

//   // ✅ Game loop — runs only once
//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d");

//     const update = () => {
//       let { x, y } = posRef.current;

//       if (keysRef.current["ArrowUp"]) y -= speed;
//       if (keysRef.current["ArrowDown"]) y += speed;
//       if (keysRef.current["ArrowLeft"]) x -= speed;
//       if (keysRef.current["ArrowRight"]) x += speed;

//       // keep inside bounds
//       x = Math.max(radius, Math.min(width - radius, x));
//       y = Math.max(radius, Math.min(height - radius, y));

//       posRef.current = { x, y };

//       // clear & redraw
//       ctx.fillStyle = "black";
//       ctx.fillRect(0, 0, width, height);

//       ctx.beginPath();
//       ctx.arc(x, y, radius, 0, Math.PI * 2);
//       ctx.fillStyle = "red";
//       ctx.fill();

//       requestAnimationFrame(update);
//     };

//     update();
//   }, [width, height]); // ✅ only runs once, unless canvas size changes

//   return (
//     <canvas
//       ref={canvasRef}
//       width={width}
//       height={height}
//       style={{
//         display: "block",
//         background: "black",
//         border: "2px solid #333",
//       }}
//     />
//   );
// };

// export default GameCanvas_v2;


// Diagonal movement fixed
const GameCanvas_v2 = ({ width, height }) => {
  const canvasRef = useRef(null);
  const keysRef = useRef({});
  const posRef = useRef({ x: 100, y: 100 });
  const speed = 2.5;
  const radius = 20;

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
      let { x, y } = posRef.current;

      let dx = 0;
      let dy = 0;

      if (keysRef.current["ArrowUp"]) dy -= 1;
      if (keysRef.current["ArrowDown"]) dy += 1;
      if (keysRef.current["ArrowLeft"]) dx -= 1;
      if (keysRef.current["ArrowRight"]) dx += 1;

      // normalize diagonal speed (so diagonal isn’t faster)
      if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
      }

      x += dx * speed;
      y += dy * speed;

      // keep inside bounds
      x = Math.max(radius, Math.min(width - radius, x));
      y = Math.max(radius, Math.min(height - radius, y));

      posRef.current = { x, y };

      // clear & redraw
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "red";
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

export default GameCanvas_v2;
