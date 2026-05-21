const express = require('express');
const testCasesRouter = require('./routes/test-cases');
const testSuitesRouter = require('./routes/test-suites');
const bugsRouter = require('./routes/bugs');
const testRunsRouter = require('./routes/test-runs');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Server is running.' });
});

app.use('/api/test-cases', testCasesRouter);
app.use('/api/test-suites', testSuitesRouter);
app.use('/api/bugs', bugsRouter);
app.use('/api/test-runs', testRunsRouter);
app.use('/api/dashboard', dashboardRouter);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
