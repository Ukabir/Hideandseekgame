import React from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import GameCanvas_v1 from "./Pages/Version1";
import GameCanvas_v2 from "./Pages/Version2";
import GameCanvas_v3 from "./Pages/Version3";
import GameCanvas_v4 from "./Pages/Version4";
import GameCanvas_v5 from "./Pages/Version5";
import GameCanvas_v6 from "./Pages/Version6";
import GameCanvas_v7 from "./Pages/Version7";
import GameCanvas_v8 from "./Pages/Version8";
import GameCanvas_v9 from "./Pages/Version9";
import GameCanvas_v10 from "./Pages/Version10";
import GameCanvas_v11 from "./Pages/FinalVersion";
import GameCanvas_v12 from "./Pages/Mobile";

const Home = () => {
  const navigate = useNavigate();
  const versions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100 text-center">
      <h1 className="mb-4">🎮 Hide And Seek</h1>
      <h3 className="mb-4">For any suggestions or fixes check my <a href="https://kaytee-portfolio.vercel.app/" target="_blank">portfolio</a> and send a message</h3>
      <p>Select a version to play:</p>
      <div className="d-flex flex-wrap justify-content-center gap-3 mt-3">
        {versions.map((version) => (
          <button
            key={version}
            className="btn btn-primary"
            onClick={() => navigate(`/v${version}`)}
          >
            Play Version {version}
          </button>
        ))}
      </div>
    </div>
  );
};

function App() {
  const canvasWidth = 1500;
  const canvasHeight = 700;
  const navigate = useNavigate()
  const location = useLocation()
  const paths = ['/'].includes(window.location.pathname)
  return (
    <div className="d-flex flex-column align-items-center justify-content-center">
      {paths ?
        <h3>Only Version 12 for mobile</h3>
      : 
      <button className="btn btn-secondary" onClick={() => navigate("/")}>
        ⬅ Back to Versions
      </button>
}  
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/v1" element={<GameCanvas_v1 width={canvasWidth} height={canvasHeight} />} />
        <Route path="/v2" element={<GameCanvas_v2 width={canvasWidth} height={canvasHeight} />} />
        <Route path="/v3" element={<GameCanvas_v3 width={canvasWidth} height={canvasHeight} />} />
        <Route path="/v4" element={<GameCanvas_v4 width={canvasWidth} height={canvasHeight} />} />
        <Route path="/v5" element={<GameCanvas_v5 width={canvasWidth} height={canvasHeight} />} />
        <Route path="/v6" element={<GameCanvas_v6 width={canvasWidth} height={canvasHeight} />} />
        <Route path="/v7" element={<GameCanvas_v7 width={canvasWidth} height={canvasHeight} />} />
        <Route path="/v8" element={<GameCanvas_v8 width={canvasWidth} height={canvasHeight} />} />
        <Route path="/v9" element={<GameCanvas_v9 width={canvasWidth} height={canvasHeight} />} />
        <Route path="/v10" element={<GameCanvas_v10 width={canvasWidth} height={canvasHeight} />} />
        <Route path="/v11" element={<GameCanvas_v11 width={canvasWidth} height={canvasHeight} />} />
        <Route path="/v12" element={<GameCanvas_v12 width={canvasWidth} height={canvasHeight} />} />
      </Routes>
    </div>
  );
}

export default App;
