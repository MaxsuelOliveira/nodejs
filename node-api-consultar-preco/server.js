import app from './src/app.js';

const PORT = 3010 || 3011;

app.listen(PORT, () => {
  console.log(`ONLINE -> http://localhost:${PORT}`);
});