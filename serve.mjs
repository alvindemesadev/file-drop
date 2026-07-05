import { createServer } from 'net';
import { spawn } from 'child_process';

const PREFERRED = Number(process.env.PORT) || 3001;
const MAX_ATTEMPTS = 20;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port, '0.0.0.0');
  });
}

async function findFreePort(start) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (await isPortFree(start + i)) return start + i;
  }
  throw new Error(`No free port found after ${MAX_ATTEMPTS} attempts`);
}

const port = await findFreePort(PREFERRED);
const child = spawn('npx', ['next', 'start', '-H', '0.0.0.0', '-p', String(port)], {
  stdio: 'inherit',
  env: { ...process.env },
});

console.log(`\n  FileDrop: http://0.0.0.0:${port}\n`);
