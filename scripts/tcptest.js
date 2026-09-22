const net = require('net');
const host = process.argv[2];
const port = parseInt(process.argv[3] || '5432', 10);
const start = Date.now();
const sock = net.createConnection({ host, port });
sock.setTimeout(12000);
sock.on('connect', () => {
  console.log('TCP_OK', host, port, (Date.now() - start) + 'ms');
  sock.destroy();
  process.exit(0);
});
sock.on('timeout', () => {
  console.log('TCP_TIMEOUT', host, port);
  sock.destroy();
  process.exit(0);
});
sock.on('error', (e) => {
  console.log('TCP_FAIL', host, port, e.message);
  process.exit(0);
});
