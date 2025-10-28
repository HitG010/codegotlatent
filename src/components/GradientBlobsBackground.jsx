// import React from "react";

// // 🎨 Blob configuration — easily edit colors/sizes/speed here
// const BLOB_CONFIGS = [
//   {
//     color: "#1e00ffff", // blue-500
//     opacity: 0.28,
//     size: 500,
//     animation: "float1 18s ease-in-out infinite alternate"
//   },
//   {
//     color: "#ffd632ff", // yellow-400
//     opacity: 0.18,
//     size: 400,
//     animation: "float2 22s ease-in-out infinite alternate"
//   },
//   {
//     color: "#3898f8ff", // sky-400
//     opacity: 0.15,
//     size: 350,
//     animation: "float3 20s ease-in-out infinite alternate"
//   }
// ];

// export default function GradientBlobsBackground() {
//   return (
//     // <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
//     //   <style>{`
//     //     @keyframes float1 {
//     //       0%   { transform: translate(-40px, -60px) scale(1.03); }
//     //       25%  { transform: translate(120px, 80px) scale(1.08); }
//     //       50%  { transform: translate(-80px, 120px) scale(1.05); }
//     //       75%  { transform: translate(60px, -40px) scale(1.07); }
//     //       100% { transform: translate(0px, 0px) scale(1.03); }
//     //     }
//     //     @keyframes float2 {
//     //       0%   { transform: translate(0, 0) scale(1); }
//     //       30%  { transform: translate(-100px, 60px) scale(1.07); }
//     //       60%  { transform: translate(80px, -80px) scale(1.09); }
//     //       100% { transform: translate(0, 0) scale(1); }
//     //     }
//     //     @keyframes float3 {
//     //       0%   { transform: translate(0, 0) scale(1); }
//     //       40%  { transform: translate(60px, 100px) scale(1.08); }
//     //       80%  { transform: translate(-60px, -80px) scale(1.06); }
//     //       100% { transform: translate(0, 0) scale(1); }
//     //     }
//     //   `}</style>

//     //   {/* Fun, dynamic, and staggered blobs */}
//     //   <div
//     //     style={{
//     //       position: "absolute",
//     //       top: "-8%",
//     //       left: "-10%",
//     //       width: BLOB_CONFIGS[0].size,
//     //       height: BLOB_CONFIGS[0].size,
//     //       background: BLOB_CONFIGS[0].color,
//     //       opacity: BLOB_CONFIGS[0].opacity,
//     //       filter: "blur(140px)",
//     //       borderRadius: "50%",
//     //       mixBlendMode: "lighten",
//     //       animation: BLOB_CONFIGS[0].animation,
//     //       willChange: "transform"
//     //     }}
//     //   />
//     //   <div
//     //     style={{
//     //       position: "absolute",
//     //       top: "60%",
//     //       left: "-8%",
//     //       width: BLOB_CONFIGS[1].size,
//     //       height: BLOB_CONFIGS[1].size,
//     //       background: BLOB_CONFIGS[1].color,
//     //       opacity: BLOB_CONFIGS[1].opacity,
//     //       filter: "blur(140px)",
//     //       borderRadius: "50%",
//     //       mixBlendMode: "lighten",
//     //       animation: BLOB_CONFIGS[1].animation,
//     //       willChange: "transform"
//     //     }}
//     //   />
//     //   <div
//     //     style={{
//     //       position: "absolute",
//     //       top: "20%",
//     //       left: "65%",
//     //       width: BLOB_CONFIGS[2].size,
//     //       height: BLOB_CONFIGS[2].size,
//     //       background: BLOB_CONFIGS[2].color,
//     //       opacity: BLOB_CONFIGS[2].opacity,
//     //       filter: "blur(140px)",
//     //       borderRadius: "50%",
//     //       mixBlendMode: "lighten",
//     //       animation: BLOB_CONFIGS[2].animation,
//     //       willChange: "transform"
//     //     }}
//     //   />
//     // </div>
//     <div className="fixed inset-0 -z-10 pointer-events-none">
//   <div className="absolute inset-0 animate-gradient opacity-50"
//        style={{
//          background: `
//            radial-gradient(at 20% 30%, #1e00ff40, transparent 70%),
//            radial-gradient(at 80% 70%, #ffd63230, transparent 70%),
//            radial-gradient(at 60% 20%, #3898f830, transparent 70%)
//          `,
//          backgroundBlendMode: "lighten",
//          filter: "blur(60px)",
//        }}
//   />
//   <style>{`
//     @keyframes gradientMove {
//       0%, 100% { background-position: 0% 0%, 100% 100%, 50% 50%; }
//       50% { background-position: 50% 50%, 0% 100%, 100% 0%; }
//     }
//     .animate-gradient {
//       animation: gradientMove 30s ease-in-out infinite alternate;
//     }
//   `}</style>
// </div>

//   );
// }

import React, { useEffect, useRef } from "react";

export default function GradientBlobsBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // 🎨 Blob configuration
    const blobs = [
      {
        x: width * 0.2,
        y: height * 0.2,
        baseX: width * 0.2,
        baseY: height * 0.2,
        radius: 400,
        color: "rgba(30, 0, 255, 0.18)", // blue
        speed: 0.5,
        offset: 0
      },
      {
        x: width * 0.15,
        y: height * 0.75,
        baseX: width * 0.15,
        baseY: height * 0.75,
        radius: 400,
        color: "rgba(255, 214, 50, 0.12)", // yellow
        speed: 0.35,
        offset: 1.3
      },
      {
        x: width * 0.75,
        y: height * 0.35,
        baseX: width * 0.75,
        baseY: height * 0.35,
        radius: 400,
        color: "rgba(56, 152, 248, 0.12)", // sky blue
        speed: 0.4,
        offset: 2.5
      }
    ];

    let startTime = null;

    function drawBlob(blob, time) {
      const t = time / 1000; // convert ms → s
      blob.x = blob.baseX + Math.sin(t * blob.speed + blob.offset) * 80;
      blob.y = blob.baseY + Math.cos(t * blob.speed + blob.offset * 2) * 60;

      const gradient = ctx.createRadialGradient(
        blob.x,
        blob.y,
        blob.radius * 0.25,
        blob.x,
        blob.y,
        blob.radius
      );
      gradient.addColorStop(0, blob.color);
      gradient.addColorStop(0.8, "rgba(0,0,0,0)");


      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function animate(time) {
      if (!startTime) startTime = time;
      ctx.clearRect(0, 0, width, height);

      // blend softly for “lighten” effect
      ctx.globalCompositeOperation = "lighter";

      blobs.forEach((blob) => drawBlob(blob, time));

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}
