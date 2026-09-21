const WebSocket = require("ws");

const PORT = 8080;

const server = new WebSocket.Server({
    host: "0.0.0.0",
    port: PORT
});

const rooms = new Map();

function generateCode() {
    let code;

    do {
        code = String(
            Math.floor(1000 + Math.random() * 9000)
        );
    } while (rooms.has(code));

    return code;
}

function send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

server.on("connection", (ws) => {

    console.log("Jugador conectado.");

    ws.on("message", (message) => {

        let data;

        try {
            data = JSON.parse(message.toString());
        } catch {
            return;
        }

        // CREAR SALA
        if (data.type === "create") {

            const code = generateCode();

            rooms.set(code, {
                players: []
            });

            const room = rooms.get(code);

            room.players.push({
                ws: ws,
                name: data.name,
                color: "white"
            });

            ws.roomCode = code;
            ws.color = "white";

            send(ws, {
                type: "created",
                code: code,
                color: "white"
            });

            console.log(
                "Sala creada:",
                code
            );
        }

        // UNIRSE A SALA
        if (data.type === "join") {

            const code = String(data.code);

            if (!rooms.has(code)) {

                send(ws, {
                    type: "error",
                    message: "La sala no existe."
                });

                return;
            }

            const room = rooms.get(code);

            if (room.players.length >= 2) {

                send(ws, {
                    type: "error",
                    message: "La sala está llena."
                });

                return;
            }

            room.players.push({
                ws: ws,
                name: data.name,
                color: "black"
            });

            ws.roomCode = code;
            ws.color = "black";

            send(ws, {
                type: "connected",
                code: code,
                color: "black"
            });

            const whitePlayer =
                room.players.find(
                    player => player.color === "white"
                );

            if (whitePlayer) {

                send(whitePlayer.ws, {
                    type: "player_joined",
                    name: data.name
                });

            }

            console.log(
                "Jugador se unió a:",
                code
            );
        }

        // MOVIMIENTO
        if (data.type === "move") {

            const code = ws.roomCode;

            if (!code || !rooms.has(code)) {
                return;
            }

            const room = rooms.get(code);

            for (const player of room.players) {

                if (player.ws !== ws) {

                    send(player.ws, {
                        type: "move",
                        board: data.board,
                        turn: data.turn
                    });

                }
            }
        }
    });

    // DESCONECTAR
    ws.on("close", () => {

        console.log(
            "Jugador desconectado."
        );

        const code = ws.roomCode;

        if (!code || !rooms.has(code)) {
            return;
        }

        const room = rooms.get(code);

        room.players =
            room.players.filter(
                player => player.ws !== ws
            );

        for (const player of room.players) {

            send(player.ws, {
                type: "opponent_left"
            });

        }

        if (room.players.length === 0) {

            rooms.delete(code);

            console.log(
                "Sala eliminada:",
                code
            );
        }
    });
});

console.log(
    "ChessLink Server iniciado en puerto " + PORT
);
