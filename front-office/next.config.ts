import type { NextConfig } from "next";

/*
 * Relais vers l'API : quand le site est ouvert depuis une autre adresse que localhost
 * (téléphone sur le réseau, tunnel https pour tester la caméra), le navigateur appelle
 * /api/v1/... et /media/... sur le site lui-même, et Next.js transmet au backend.
 * Voir src/services/apiConfig.ts.
 */
const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/api\/v\d+\/?$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  // tunnel https de test (cloudflared) : autorise le rechargement à chaud depuis ces adresses
  allowedDevOrigins: ["*.trycloudflare.com"],
  async rewrites() {
    return [
      { source: "/api/v1/:chemin*", destination: `${API}/api/v1/:chemin*` },
      { source: "/media/:chemin*", destination: `${API}/media/:chemin*` },
    ];
  },
};

export default nextConfig;
