import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from "fs";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        https: {
            key: fs.readFileSync(path.resolve(__dirname, "certs/localhost.key")),
            cert: fs.readFileSync(path.resolve(__dirname, "certs/localhost.crt")),
        },
        port: 5173,
        proxy: {
            "/api": {
                target: "https://localhost:7287",
                secure: false
            },
            "/account": {
                target: "https://localhost:7287",
                secure: false
            },
            "/Saml2": {
                target: "https://localhost:7287",
                secure: false
            }
        }
    }
})
