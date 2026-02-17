#!/usr/bin/env node

const { spawn } = require('child_process');
const net = require('net');

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function findAvailablePort(startPort = 3000) {
  let port = startPort;
  while (port < startPort + 100) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error('No available ports found');
}

async function main() {
  try {
    const port = await findAvailablePort(3000);
    console.log(`Starting server on port ${port}...`);
    
    const child = spawn('next', ['start', '-p', port.toString()], {
      stdio: 'inherit',
      shell: true
    });

    child.on('error', (error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
