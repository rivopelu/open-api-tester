const path = require('node:path')

module.exports = {
  apps: [
    {
      name: 'open-api-tester-server',
      cwd: path.join(__dirname, 'apps/server'),
      // Same runtime as `pnpm --filter @modern-api-studio/server start`: Node + tsx.
      script: 'src/index.ts',
      interpreter: 'node',
      interpreter_args: '--env-file=../../.env --import tsx',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      // Treat a process that dies within 10s as a failed start instead of "online".
      min_uptime: '10s',
      max_restarts: 5,
      env: {
        // APP_ENV/PORT/etc come from the .env file loaded via --env-file above.
      },
    },
  ],
}
