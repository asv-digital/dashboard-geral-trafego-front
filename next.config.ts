import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Proxy /api/* pro backend Express esta em src/app/api/[[...path]]/route.ts.
  // Esse proxy strip-a content-length/encoding/transfer-encoding pra evitar
  // CURLE_HTTP2_STREAM (bug Next 16 com upstream chunked). Nao usar rewrites()
  // aqui porque rewrites pulam essa logica de header e re-introduzem o bug.
};

export default nextConfig;
