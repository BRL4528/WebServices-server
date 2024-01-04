const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const { spawn } = require("child_process");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let cppProcess;

app.use(express.json());
app.use(cors());

// STREAM
// app.get("/", function (req, res) {
//   res.sendFile(__dirname + "/index.html");
// });

// app.get("/video", function (req, res) {
//   // Ensure there is a range given for the video
//   const range = req.headers.range;

//   console.log(range)
//   if (!range) {
//     res.status(400).send("Requires Range header");
//   }

//   const videoPath = "falador.mp4";
//   const videoSize = fs.statSync("falador.mp4").size;

//   const CHUNK_SIZE = 10 ** 6; // 1MB
//   const start = Number(range.replace(/\D/g, ""));
//   const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

//   // Create headers
//   const contentLength = end - start + 1;
//   const headers = {
//     "Content-Range": `bytes ${start}-${end}/${videoSize}`,
//     "Accept-Ranges": "bytes",
//     "Content-Length": contentLength,
//     "Content-Type": "video/mp4",
//   };

//   // HTTP Status 206 for Partial Content
//   res.writeHead(206, headers);

//   // create video read stream for this particular chunk
//   const videoStream = fs.createReadStream(videoPath, { start, end });

//   // Stream the video chunk to the client
//   videoStream.pipe(res);
// });

// app.listen(8000, function () {
//   console.log("Listening on port 8000!");
// });

app.get('/spawn', (req, res) => {
  console.log('Rota /spawn foi acessada. Iniciando o programa C++...');

  // Iniciar o programa C++ como um processo separado
  cppProcess = spawn('/home/rasp/project/darknet_test/main');

  cppProcess.stdout.on('data', (data) => {
    console.log(`Saída do programa C++: ${data}`);
    // Aqui você pode enviar a saída para o cliente WebSocket, se necessário
  });

  cppProcess.stderr.on('data', (data) => {
    console.error(`Erro do programa C++: ${data}`);
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send('program_error');
      }
    });
    // Aqui você pode lidar com os erros do programa C++
  });

  cppProcess.on('close', (code) => {
    console.log(`Programa C++ encerrado com código de saída ${code}`);

    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send('program_finalized');
      }
    });
  });

  res.status(200).json({ message: 'Programa C++ iniciado' });
});


//STREAM 2

app.get('/video', (req, res) => {
  const { videoPath } = req.query; // Path to your video file
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Start the server
// app.listen(3000, () => {
//   console.log('Server is running on port 3000');
// });

//APP
app.get('/videos', (req, res) => {
  const videos = fs.readdirSync('videos');

  const videosMap = videos.map(video => {
    return `${__dirname}${'/'}videos${'/'}${video}`
    // return `C:/Users/bruno.carvalho/MidasCorp/WebServices-server${'/'}videos${'/'}${video}`
  })

  res.json(videosMap)
});

// WebSocket
wss.on('connection', function connection(ws) {
  console.log('Cliente conectado!');

  ws.on('message', function incoming(message) {
    const msgString = Buffer.from(message).toString();
    console.log('Mensagem recebida do cliente:', msgString);

    // Tratamento das mensagens recebidas
    if (msgString === 'roudProgram') {
      // Se a mensagem for 'roudProgram', não será mais necessário iniciar o programa aqui
      console.log('Agora a inicialização do programa é realizada pela rota /spawn');
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

app.delete('/videos/:videoName', (req, res) => {
  const videoName = req.params.videoName; // Obtém o nome do vídeo dos parâmetros da URL
  const videoPath = path.join('/videos', videoName); // Caminho completo para o vídeo

  fs.unlink(videoPath, (err) => {
    if (err) {
      console.error('Erro ao excluir o vídeo:', err);
      res.status(500).json({ error: 'Erro ao excluir o vídeo' });
    } else {
      console.log('Vídeo excluído com sucesso:', videoName);
      res.status(200).json({ message: 'Vídeo excluído com sucesso' });
    }
  });
});


// Inicia o servidor
const PORT = 3333;
server.listen(PORT, () => {
  console.log(`Servidor WebSocket e HTTP rodando na porta ${PORT}`);
});
