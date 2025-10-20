// GameCanvas_v1.jsx
import React, { useRef, useEffect, useState } from "react";

const GameCanvas_v1 = ({width, height}) => {
  const canvasRef = useRef(null);
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const speed = 5;

  useEffect(() => {
    const handleKeyDown = (e) => {
      setPos((prev) => {
        switch (e.key) {
          case "ArrowUp":
            return { ...prev, y: prev.y - speed };
          case "ArrowDown":
            return { ...prev, y: prev.y + speed };
          case "ArrowLeft":
            return { ...prev, x: prev.x - speed };
          case "ArrowRight":
            return { ...prev, x: prev.x + speed };
          default:
            return prev;
        }
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();
  }, [pos]);

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

export default GameCanvas_v1;
