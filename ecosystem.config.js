module.exports = {
  apps: [
    {
      name: "nextjs-app",
      script: "npm",
      args: "start",
      cwd: "/home/vernon/app/texttract-mint",
      env: {
        NODE_ENV: "production",
      },
      //   instances: "max", // Use all available CPU cores
      instance: 1,
      //   exec_mode: "cluster", // Cluster mode for load balancing
      exec_mode: "fork", // Cluster mode for load balancing
      log_file: "/home/vernon/app/texttract-mint/logs/pm2.log", // Log file location
      out_file: "/home/vernon/app/texttract-mint/logs/out.log", // Standard output log file
      error_file: "/home/vernon/app/texttract-mint/logs/error.log", // Error log file
      watch: false, // Disable watching for production environments (you can enable this if you need live updates during development)
    },
  ],
};
