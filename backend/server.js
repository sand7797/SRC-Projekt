const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

//Public mappen gøres offentlig, så spillet er online
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

//Nøvendige filer
const lobbies = {};

//On connection
wss.on('connection', (ws) => {
    console.log('Client connected');

    let currentLobby;
    // Lyt efter beskeder
    ws.on('message', (message) => {
	// Lobbysystem
	const data = JSON.parse(message);
	if (data.message === 'AnmodSpillerID') {
	    console.log('Received spilID:', data.spilID);  // Print spilID
	    
	    currentLobby = data.spilID;
	    if (!lobbies[currentLobby]) {
		lobbies[currentLobby] = { players: [], playerCount: 0 };
	    }

	    let playerID;
		if (lobbies[currentLobby].playerCount === 0) {
		    lobbies[currentLobby].players.push({message: "pos"});
		    playerID = 1;
		} else if (lobbies[currentLobby].playerCount === 1) {
		    playerID = 2;
		} else {
		    playerID = 'Fuld Lobby';  // Der kan kun spille to ad gangen
		}
		if (playerID !== 'Fuld Lobby') {
		    const player = {id: playerID}
		    lobbies[currentLobby].players.push(player);
		    lobbies[currentLobby].playerCount++;
		} else {
		  //Lukker med kode, så lobbysystemet ikke fucker op
		  ws.close(4001);
		}
	    ws.send(JSON.stringify({ message: 'GivenSpillerID', spillerID: playerID }));
	}
      

	//Position
	if (data.type === 'pos') {
	    currentLobby = data.spilID;
	    //Find spilleren i players arrayen
	    var playerObj = lobbies[currentLobby].players.find(item => item.id === data.player);
	    if (playerObj) {
	    playerObj.x = data.camX;
	    playerObj.y = data.camY;
	    playerObj.z = data.camZ;
	    }
	    if (lobbies[currentLobby].playerCount == 2) {
		ws.send(JSON.stringify(lobbies[currentLobby].players));
	    }
	}

    });

    ws.on('close', (code) => {
	//Lobbysystem
	if (lobbies[currentLobby]) {
	  if (code !== 4001) {
	    console.log("closed");
	    lobbies[currentLobby].players.pop();
	    lobbies[currentLobby].playerCount--;
	    if (lobbies[currentLobby].playerCount == 0) {
	      delete lobbies[currentLobby]
	    }
	  }
	}
    });
});

//debug

setInterval(() => {
  if (lobbies["debuglobby"]) {
    console.log(lobbies["debuglobby"].players);}
}, 1000);

// Start HTTP Serveren
server.listen(8080, () => {
    console.log('Webserver aktiv');
});
