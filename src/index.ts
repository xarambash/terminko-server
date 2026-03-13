import express from 'express';

const app = express();
const PORT = process.env.PORT || 5000;


app.get('/health', (req, res) => {
  console.log('Health check');
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
