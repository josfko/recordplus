// PM2 Configuration
export default {
  apps: [
    {
      name: "legal-api",
      script: "src/server/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DB_PATH: "/home/appuser/data/legal-cases.db",
        DOCUMENTS_PATH: "/home/appuser/data/documents",
      },
    },
  ],
};
