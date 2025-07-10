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
    } else if (!personagensUsados.includes("nephis")) {
      personagem = "nephis";
    } else {
      socket.emit("sala-cheia"); // Caso ambos os personagens já estejam em uso
      return;
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
      `[Servidor] Jogador ${socket.id} (${personagem}) entrou na sala ${salaId}. Total: ${Object.keys(sala.jogadores).length}`
    );

    // Notificar jogadores sobre a lista atual de jogadores na sala
    io.to(salaId).emit("jogadores", Object.keys(sala.jogadores));

    // Iniciar jogo apenas quando a sala estiver completa com 2 jogadores
    if (Object.keys(sala.jogadores).length === 2) {
      console.log(
        `[Servidor] Sala ${salaId} completa. Enviando 'iniciar-jogo'.`
      );
      io.to(salaId).emit("iniciar-jogo", sala.jogadores);
    }
  });

  // Eventos de sinalização WebRTC - otimizados para melhor performance
  socket.on("offer", (salaId, description) => {
    console.log(`[WebRTC] Retransmitindo oferta para sala ${salaId}`);
    socket.to(salaId).emit("offer", description);
  });

  socket.on("answer", (salaId, description) => {
    console.log(`[WebRTC] Retransmitindo resposta para sala ${salaId}`);
    socket.to(salaId).emit("answer", description);
  });

  socket.on("candidate", (salaId, candidate) => {
    console.log(`[WebRTC] Retransmitindo candidato ICE para sala ${salaId}`);
    socket.to(salaId).emit("candidate", candidate);
  });

  // Fallback para Socket.IO quando WebRTC não estiver disponível
  socket.on("atualizacao-jogador", (dados) => {
    const salaId = socket.salaId;
    if (
      salaId &&
      salasAtivas[salaId] &&
      salasAtivas[salaId].jogadores[socket.id]
    ) {
      // Atualizar estado local do servidor (para novos jogadores que entram)
      salasAtivas[salaId].jogadores[socket.id] = dados;

      // Retransmitir apenas se necessário (fallback)
      socket.to(salaId).emit("outro-jogador-atualizado", dados);
    }
  });

  // Sincronização de esqueletos
  socket.on("skeleton-update", (dados) => {
    const salaId = socket.salaId;
    if (salaId) {
      // Retransmitir estado do esqueleto para outros jogadores na sala
      socket.to(salaId).emit("skeleton-sync", dados);
    }
  });

  socket.on("jogador-morreu", (data) => {
    const salaId = socket.salaId;
    if (salaId && salasAtivas[salaId]) {
      console.log(`[MORTE] Jogador ${socket.id} morreu na sala ${salaId}. Personagem: ${data.personagem}`);
      
      // Notificar TODOS os jogadores da sala (incluindo o que morreu) sobre a morte
      io.to(salaId).emit("jogador-morreu", {
        ...data,
        jogadorMortoId: socket.id,
        timestamp: Date.now()
      });
      
      // Aguardar um pouco e então resetar a sala
      setTimeout(() => {
        if (salasAtivas[salaId]) {
          console.log(`[RESET] Resetando sala ${salaId} após morte`);
          
          // Resetar estado da sala
          salasAtivas[salaId].jogadores = {};
          salasAtivas[salaId].jogoIniciado = false;
          
          // Notificar todos os jogadores para resetar
          io.to(salaId).emit("resetar-sala", {
            motivo: "morte",
            timestamp: Date.now()
          });
        }
      }, 2000); // 2 segundos de delay para permitir animação de morte
    }
  });

  socket.on("sair-da-sala", () => {
    const salaId = socket.salaId;
    if (
      salaId &&
      salasAtivas[salaId] &&
      salasAtivas[salaId].jogadores[socket.id]
    ) {
      console.log(`[Servidor] Jogador ${socket.id} saiu da sala ${salaId}.`);
      delete salasAtivas[salaId].jogadores[socket.id];
      socket.leave(salaId);
      socket.salaId = null;
      io.to(salaId).emit("jogador-desconectado", socket.id);

      if (Object.keys(salasAtivas[salaId].jogadores).length === 0) {
        delete salasAtivas[salaId];
        console.log(`[Servidor] Sala ${salaId} vazia e removida.`);
      }
    }
  });

  socket.on("disconnect", () => {
    const salaId = socket.salaId;
    if (salaId && salasAtivas[salaId] && salasAtivas[salaId].jogadores[socket.id]) {
      console.log(`[Servidor] Jogador ${socket.id} desconectou da sala ${salaId}.`);
      delete salasAtivas[salaId].jogadores[socket.id];
      io.to(salaId).emit("jogador-desconectado", socket.id);

      // Se a sala não estiver vazia, resetar para os jogadores restantes
      if (Object.keys(salasAtivas[salaId].jogadores).length > 0) {
        console.log(`[Servidor] Resetando sala ${salaId} devido à desconexão de ${socket.id}.`);
        io.to(salaId).emit("resetar-sala");
        delete salasAtivas[salaId]; // Limpar a sala no servidor
      } else {
        // Se a sala ficar vazia, remover a sala
        delete salasAtivas[salaId];
        console.log(`[Servidor] Sala ${salaId} vazia e removida.`);
      }
    }
    console.log(`[Servidor] Usuário ${socket.id} desconectado do servidor`);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(
    `[Servidor] Jogo rodando na porta ${port}. Acesse pela sua rede local.`
  );
});
