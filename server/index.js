const express = require('express');
const path    = require('path');
const testCasesRouter = require('./routes/test-cases');
const testSuitesRouter = require('./routes/test-suites');
const bugsRouter = require('./routes/bugs');
const testRunsRouter = require('./routes/test-runs');
const dashboardRouter = require('./routes/dashboard');
const reportsRouter = require('./routes/reports');
const testCasesImportRouter = require('./routes/test-cases-import');
const settingsRouter        = require('./routes/settings');

const app  = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Server is running.' });
});

app.use('/api/test-cases/import', testCasesImportRouter);
app.use('/api/test-cases', testCasesRouter);
app.use('/api/test-suites', testSuitesRouter);
app.use('/api/bugs', bugsRouter);
app.use('/api/test-runs', testRunsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports',  reportsRouter);
app.use('/api/settings', settingsRouter);

// In production, Express serves the Vite build and handles SPA routing.
// In dev, Vite's dev server handles the frontend and proxies /api to this port.
if (isProd) {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
