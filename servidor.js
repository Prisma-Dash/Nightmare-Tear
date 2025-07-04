const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const path = require("path");
const port = process.env.PORT || 3000;

let salasAtivas = {};

app.use(express.static(path.join(__dirname, "client")));

io.on("connection", (socket) => {
  console.log(`[Servidor] Usuário conectado: ${socket.id}`);

  socket.on("entrar-na-sala", (salaId) => {
    if (!salasAtivas[salaId]) {
      salasAtivas[salaId] = {
        id: salaId,
        jogadores: {},
      };
    }

    const sala = salasAtivas[salaId];

    if (Object.keys(sala.jogadores).length >= 2) {
      socket.emit("sala-cheia");
      return;
    }

    socket.join(salaId);
    socket.salaId = salaId;

    let personagem;
    const personagensUsados = Object.values(sala.jogadores).map(
      (j) => j.personagem
    );

    if (!personagensUsados.includes("suny")) {
      personagem = "suny";
    } else {
      personagem = "nephis";
    }

    const novoJogador = {
      id: socket.id,
      personagem: personagem,
      x: 3200,
      y: 500,
      vida: 200,
      direcao: "frente",
      anim: `${personagem}-parado-frente`,
    };

    sala.jogadores[socket.id] = novoJogador;
    socket.emit("estadoDaSala", sala.jogadores);
    socket.to(salaId).emit("novoJogadorNaSala", novoJogador);

    console.log(
      `[Servidor] Jogador ${
        socket.id
      } (${personagem}) entrou na sala ${salaId}. Total: ${
        Object.keys(sala.jogadores).length
      }`
    );

    const jogadoresNaSala = Array.from(
      io.sockets.adapter.rooms.get(salaId) || []
    );
    let jogadores = {
      primeiro: jogadoresNaSala[0],
      segundo: jogadoresNaSala[1] || null,
    };
    io.to(salaId).emit("jogadores", jogadores);

    if (Object.keys(sala.jogadores).length === 2) {
      console.log(
        `[Servidor] Sala ${salaId} completa. Enviando 'iniciar-jogo'.`
      );
      io.to(salaId).emit("iniciar-jogo", sala.jogadores);
    }
  });

  socket.on("atualizacao-jogador", (dados) => {
    const salaId = socket.salaId;
    if (
      salaId &&
      salasAtivas[salaId] &&
      salasAtivas[salaId].jogadores[socket.id]
    ) {
      salasAtivas[salaId].jogadores[socket.id] = dados;
      socket.to(salaId).emit("outro-jogador-atualizado", dados);
    }
  });

  socket.on("offer", (salaId, description) => {
    socket.to(salaId).emit("offer", description);
  });
  socket.on("answer", (salaId, description) => {
    socket.to(salaId).emit("answer", description);
  });
  socket.on("candidate", (salaId, candidate) => {
    socket.to(salaId).emit("candidate", candidate);
  });

  socket.on("jogador-morreu", (data) => {
    const salaId = socket.salaId;
    if (salaId && salasAtivas[salaId]) {
      socket.to(salaId).emit("jogador-morreu", data);
    }
  });

  socket.on("disconnect", () => {
    const salaId = socket.salaId;
    if (
      salaId &&
      salasAtivas[salaId] &&
      salasAtivas[salaId].jogadores[socket.id]
    ) {
      console.log(
        `[Servidor] Jogador ${socket.id} desconectou da sala ${salaId}.`
      );
      delete salasAtivas[salaId].jogadores[socket.id];
      io.to(salaId).emit("jogador-desconectado", socket.id);

      if (Object.keys(salasAtivas[salaId].jogadores).length === 0) {
        delete salasAtivas[salaId];
        console.log(`[Servidor] Sala ${salaId} vazia e removida.`);
      }
    }
    console.log(`[Servidor] Usuário ${socket.id} desconectado do servidor`);
  });
  
  socket.emit("sair-da-sala");
});

server.listen(port, "0.0.0.0", () => {
  console.log(
    `[Servidor] Jogo rodando na porta ${port}. Acesse pela sua rede local.`
  );
});
