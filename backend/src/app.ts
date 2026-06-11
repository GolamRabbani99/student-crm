import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import universityRoutes from './routes/universities.js';
import statusRoutes from './routes/statuses.js';
import studentRoutes from './routes/students.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'crm-student-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

export default app;
