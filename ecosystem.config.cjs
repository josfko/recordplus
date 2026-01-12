// PM2 Configuration
module.exports = {
  apps: [
    {
      name: "recordplus",
      script: "src/server/index.js",
      cwd: "/home/appuser/recordplus",
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
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
        DB_PATH: "./data/legal-cases.db",
        DOCUMENTS_PATH: "./data/documents",
      },
    },
  ],
};
