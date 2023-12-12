const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(cors());

// Rota de autenticação básica
app.post('/authentication', (req, res) => {
  console.log('Rota POST de autenticação chamada');
  const { username, password } = req.body;

  // Lógica de autenticação básica
  if (username === 'usuario' && password === 'senha') {
    res.status(200).json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

 app.get('/teste', (req, res) => {
    console.log('Rota GET de autenticação chamada');
    res.status(200).json({ bateu: true });
  });

// WebSocket
wss.on('connection', function connection(ws) {
  console.log('Cliente conectado!');

  ws.on('message', function incoming(message) {
    const msgString = Buffer.from(message).toString();
    console.log('Mensagem recebida do cliente:', msgString);

    // Broadcast da mensagem recebida para todos os clientes conectados
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msgString);
      }
    });
  });
});

// Inicia o servidor
const PORT = 3333;
server.listen(PORT, () => {
  console.log(`Servidor WebSocket e HTTP rodando na porta ${PORT}`);
});
