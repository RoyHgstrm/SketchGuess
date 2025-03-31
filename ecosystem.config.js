module.exports = {
  apps: [
    {
      name: 'sketch-guess-frontend',
      script: 'npm',
      args: 'run start:prod',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      }
    },
    {
      name: 'sketch-guess-websocket',
      script: 'npm',
      args: 'run websocket:prod',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 8080
      }
    }
  ],
  deploy: {
    production: {
      user: 'user',
      host: 'your-server-address',
      ref: 'origin/main',
      repo: 'git-repository-url',
      path: '/var/www/sketchguess',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
}; 