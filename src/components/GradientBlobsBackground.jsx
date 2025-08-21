import React from "react";

// 🎨 Blob configuration — easily edit colors/sizes/speed here
const BLOB_CONFIGS = [
  {
    color: "#1e00ffff", // blue-500
    opacity: 0.28,
    size: 500,
    animation: "float1 18s ease-in-out infinite alternate"
  },
  {
    color: "#ffd632ff", // yellow-400
    opacity: 0.18,
    size: 400,
    animation: "float2 22s ease-in-out infinite alternate"
  },
  {
    color: "#3898f8ff", // sky-400
    opacity: 0.15,
    size: 350,
    animation: "float3 20s ease-in-out infinite alternate"
  }
];

export default function GradientBlobsBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <style>{`
        @keyframes float1 {
          0%   { transform: translate(-40px, -60px) scale(1.03); }
          25%  { transform: translate(120px, 80px) scale(1.08); }
          50%  { transform: translate(-80px, 120px) scale(1.05); }
          75%  { transform: translate(60px, -40px) scale(1.07); }
          100% { transform: translate(0px, 0px) scale(1.03); }
        }
        @keyframes float2 {
          0%   { transform: translate(0, 0) scale(1); }
          30%  { transform: translate(-100px, 60px) scale(1.07); }
          60%  { transform: translate(80px, -80px) scale(1.09); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float3 {
          0%   { transform: translate(0, 0) scale(1); }
          40%  { transform: translate(60px, 100px) scale(1.08); }
          80%  { transform: translate(-60px, -80px) scale(1.06); }
          100% { transform: translate(0, 0) scale(1); }
        }
      `}</style>

      {/* Fun, dynamic, and staggered blobs */}
      <div
        style={{
          position: "absolute",
          top: "-8%",
          left: "-10%",
          width: BLOB_CONFIGS[0].size,
          height: BLOB_CONFIGS[0].size,
          background: BLOB_CONFIGS[0].color,
          opacity: BLOB_CONFIGS[0].opacity,
          filter: "blur(140px)",
          borderRadius: "50%",
          mixBlendMode: "lighten",
          animation: BLOB_CONFIGS[0].animation,
          willChange: "transform"
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "60%",
          left: "-8%",
          width: BLOB_CONFIGS[1].size,
          height: BLOB_CONFIGS[1].size,
          background: BLOB_CONFIGS[1].color,
          opacity: BLOB_CONFIGS[1].opacity,
          filter: "blur(140px)",
          borderRadius: "50%",
          mixBlendMode: "lighten",
          animation: BLOB_CONFIGS[1].animation,
          willChange: "transform"
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "65%",
          width: BLOB_CONFIGS[2].size,
          height: BLOB_CONFIGS[2].size,
          background: BLOB_CONFIGS[2].color,
          opacity: BLOB_CONFIGS[2].opacity,
          filter: "blur(140px)",
          borderRadius: "50%",
          mixBlendMode: "lighten",
          animation: BLOB_CONFIGS[2].animation,
          willChange: "transform"
        }}
      />
    </div>
  );
}
