const aedes = require("aedes")();
const net = require("net");
const http = require("http");
const ws = require("websocket-stream");

let clientsConnected = [];

// Crée un serveur TCP pour Aedes
const server = net.createServer(aedes.handle);
const port = 1883;

server.listen(port, function () {
  console.log(`MQTT broker TCP en cours d'exécution sur le port ${port}`);
});

// Serveur WebSocket pour le broker MQTT
const httpServer = http.createServer();
const wsPort = 8888;

ws.createServer({ server: httpServer }, aedes.handle);

httpServer.listen(wsPort, function () {
  console.log(
    `MQTT broker WebSocket en cours d'exécution sur le port ${wsPort}`
  );
});

// Authentification
aedes.authenticate = function (client, username, password, callback) {
  if (
    clientsConnected.findIndex((val) => {
      return val?.username == username;
    }) != -1
  ) {
    const error = {
      returnCode: 4,
      name: "Auth Error",
      message: "There was an error during the authentification",
      stack: "Coucou",
    };
    console.warn(
      "authError",
      `Le client ${username} (${client.id}) a tenté de se connecter`
    );
    callback(error, false);
  } else {
    clientsConnected.push({ id: client.id, username: username ?? "" });
    console.warn(
      "authSuccess",
      `Le client ${username} (${client.id}) s'est connecté`
    );
    callback(null, true);
  }
};

// Gérer les événements de connexion des clients
aedes.on("client", (client) => {
  console.log("client", `Client connecté: ${client.id}`, clientsConnected);
});

// Gérer les événements de publication de messages
aedes.on("publish", (packet, client) => {
  if (client?.id) {
    console.log(
      `Message publié par (${client?.id}) sur le topic ${
        packet.topic
      }: ${packet.payload.toString()} => ${packet.qos}`
    );
  } else {
    console.log("Heartbeat : " + packet.payload.toString());
  }
});

// Gérer les événements de déconnexion des clients
aedes.on("clientDisconnect", (client) => {
  clientsConnected = clientsConnected.filter((val) => val.id != client.id);
  console.log(`Le client ${client?.id} s'est déconnecté`, clientsConnected);
});

aedes.on("subscribe", (subscriptions, client) => {
  console.log(
    `Client ${client?.id} s'est abonné à ${subscriptions
      .map((sub) => sub.topic)
      .join(", ")}`
  );
  let packet = {
    topic: subscriptions[subscriptions.length - 1].topic,
    payload: `Un client ${
      clientsConnected.filter((val) => val.id == client.id)[0].username
    } s'est connecté`,
    cmd: "publish",
    qos: 0,
    dup: false,
    retain: false,
  };
  console.log("Packet", packet);
  aedes.publish(packet, (error) => {
    console.error(error, "Une erreur est survenue");
  });
});
