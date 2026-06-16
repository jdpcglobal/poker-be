import { createServer } from 'http';
import next from 'next';
import dbConnect from '@/config/dbConnect';
import { attachSocketServer } from '@/socketServer';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT ?? '3000', 10);
const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handler(req, res));
  attachSocketServer(httpServer);
  dbConnect()
    .then(() => {
      httpServer.listen(port, () => {
        console.log(`[server] ready on port ${port}`);
      });
    })
    .catch((err) => {
      console.error('[server] failed to connect to database:', err);
      process.exit(1);
    });
});
