import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [/^openclaw\//, /^node:/, "fs", "path", "os", "util", "events", "stream", "crypto", "http", "https", "url", "querystring", "zlib", "buffer", "child_process", "net", "tls"],
    },
    outDir: "dist",
  },
});
