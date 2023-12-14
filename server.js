const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const { spawn  } = require("child_process");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let cppProcess;

app.use(express.json());
app.use(cors());

//APP
app.get('/videos', (req, res) => {
  const videos = fs.readdirSync('videos');

  const videosMap = videos.map(video => {
    return `${__dirname}${'/'}videos${'/'}${video}`
  })

  res.json(videosMap)
});

// WebSocket
wss.on('connection', function connection(ws) {
  console.log('Cliente conectado!');

  ws.on('message', function incoming(message) {
    const msgString = Buffer.from(message).toString();
    console.log('Mensagem recebida do cliente:', msgString);

    if (msgString === 'roudProgram') {
      console.log('Etapa para rodar o c++');
      // Inicie o programa C++ como um processo separado
      cppProcess = spawn('/home/rasp/project/darknet_test/main');

      cppProcess.stdout.on('data', (data) => {
        console.log(`Saída do programa C++: ${data}`);
        // Aqui você pode enviar a saída para o cliente WebSocket, se necessário
      });

      cppProcess.stderr.on('data', (data) => {
        console.error(`Erro do programa C++: ${data}`);
          wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send('program_finalized');
            }
          });
        // Aqui você pode lidar com os erros do programa C++
      });

      cppProcess.on('close', (code) => {
        console.log(`Programa C++ encerrado com código de saída ${code}`);
        
          wss.clients.forEach(function each(client) {
          
              client.send('program_finalized');
            
          });
      });
    }

    // Broadcast da mensagem recebida para todos os clientes conectados
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msgString);
      }
    });
  });
});

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

app.post('/terminateProgram', (req, res) => {
  console.log('Encerrando o programa C++');
  terminateCppProgram(); // Função que encerra o programa C++
  res.status(200).json({ message: 'Programa C++ encerrado' });
});


  const terminateCppProgram = () => {
    // var proc = require('child_process').spawn('mongod');
    cppProcess.kill('SIGINT');

    wss.clients.forEach(function each(client) {
          
      client.send('program_finalized');
    
  });
  };


// Inicia o servidor
const PORT = 3333;
server.listen(PORT, () => {
  console.log(`Servidor WebSocket e HTTP rodando na porta ${PORT}`);
});
