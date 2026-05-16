import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import chatRoute from './routes/chat.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/chat', chatRoute);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`layout-agent server listening on port ${port}`);
});

