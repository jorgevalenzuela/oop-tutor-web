import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import questionsRouter from './routes/questions';
import examRouter from './routes/exam';
import masteryConfigRouter from './routes/mastery-config';
import certificateRouter from './routes/certificate';
import instructorRouter from './routes/instructor';
import feedbackRouter from './routes/feedback';
import discussionRouter from './routes/discussion';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'assessment' });
});

app.use('/api/auth', authRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/exam', examRouter);
app.use('/api/mastery-config', masteryConfigRouter);
app.use('/api/certificates', certificateRouter);
app.use('/api/instructor', instructorRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/discussion', discussionRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Assessment service running on port ${PORT}`);
});

export default app;
