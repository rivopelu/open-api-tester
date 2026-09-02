module.exports = {
  apps: [
    {
      name: 'open-api-tester-server',
      cwd: './apps/server',
      script: 'src/index.ts',
      interpreter: 'bun',
      interpreter_args: '--env-file=../../.env',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        // APP_ENV/PORT/etc come from the .env file loaded via --env-file above.
      },
    },
  ],
}
