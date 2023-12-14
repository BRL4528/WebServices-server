const express = require('express');
const fs = require('fs');

const app = express();

const port = 3333;

app.use(express.json());

app.get('/videos', (req, res) => {
  const videos = fs.readdirSync('videos');

  videos.map((video) => {
    console.log(video)
  });

  console.log('ok')
});

app.post('/', (req, res) => {
  console.log('Mensagem recebida do C++:', req.body);
  res.send('Contagem de suínos iniciada');
});

app.listen(port, () => {
  console.log(`Servidor Node.js rodando em http://localhost:${port}`);
});