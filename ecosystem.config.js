module.exports = {
  apps: [
    {
      name: "duka-profit",
      script: "backend/server.js",
      instances: 1, // Can be set to "max" or 2+ for clustering, but 1 is safer for basic VPS and WebSockets
      exec_mode: "fork", // Use cluster mode if using instances: "max", but fork is recommended for Socket.IO state sync unless Redis adapter is set up
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 5000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
        // The PM2 process will automatically look for backend/.env or root .env
        // But you can also set specific fallback variables here
        ALLOW_PORT_RETRY: "false"
      }
    }
  ]
};
