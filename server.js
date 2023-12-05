const WebSocket = require('ws')

const wss = new WebSocket.Server({port: 3333})

wss.on('connection', function connection(ws) {
    console.log('Cliente conectado!');

    ws.on('message', function incoming(message) {
        console.log('Mensagem recebida', message);

        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message)
            }
        });
    });
});2