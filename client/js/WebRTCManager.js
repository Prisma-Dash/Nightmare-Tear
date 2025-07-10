/**
 * WebRTCManager - Gerencia conexões WebRTC para comunicação P2P no jogo
 */
export default class WebRTCManager {
  constructor(socket) {
    this.socket = socket;
    this.peerConnection = null;
    this.dataChannel = null;
    this.isInitiator = false;
    this.isConnected = false;
    this.salaId = null; // Callbacks para eventos do jogo
    this.onGameStateReceived = null;
    this.onConnectionStateChanged = null; // Configuração do servidor STUN/TURN
    this.configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };
    this.setupSocketListeners();
  }
  /**
   * Configura os ouvintes do Socket.IO para sinalização WebRTC
   */
  setupSocketListeners() {
    this.socket.on("offer", (description) => {
      console.log("[WebRTC] Oferta recebida");
      this.handleOffer(description);
    });
    this.socket.on("answer", (description) => {
      console.log("[WebRTC] Resposta recebida");
      this.handleAnswer(description);
    });
    this.socket.on("candidate", (candidate) => {
      console.log("[WebRTC] Candidato ICE recebido");
      this.handleCandidate(candidate);
    });
    this.socket.on("iniciar-jogo", (jogadores) => {
      console.log("[WebRTC] Jogo iniciado, configurando WebRTC");
      this.initializeWebRTC(jogadores);
    });
  }
  /**
   * Inicializa a conexão WebRTC
   */
  async initializeWebRTC(jogadores) {
    try {
      this.peerConnection = new RTCPeerConnection(this.configuration);
      this.setupPeerConnectionListeners(); // Determina quem é o iniciador (primeiro jogador na sala)
      const jogadorIds = Object.keys(jogadores);
      this.isInitiator = this.socket.id === jogadorIds[0];
      if (this.isInitiator) {
        console.log("[WebRTC] Sou o iniciador, criando Data Channel");
        this.createDataChannel();
        await this.createOffer();
      }
    } catch (error) {
      console.error("[WebRTC] Erro ao inicializar WebRTC:", error);
    }
  }
  /**
   * Configura os ouvintes da conexão peer
   */
  setupPeerConnectionListeners() {
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[WebRTC] Enviando candidato ICE");
        this.socket.emit("candidate", this.salaId, event.candidate);
      }
    };
    this.peerConnection.onconnectionstatechange = () => {
      console.log(
        "[WebRTC] Estado da conexão:",
        this.peerConnection.connectionState
      );
      this.isConnected = this.peerConnection.connectionState === "connected";
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged(this.isConnected);
      }
    };
    this.peerConnection.ondatachannel = (event) => {
      console.log("[WebRTC] Data Channel recebido");
      this.dataChannel = event.channel;
      this.setupDataChannelListeners();
    };
  }
  /**
   * Cria o Data Channel (apenas o iniciador)
   */
  createDataChannel() {
    this.dataChannel = this.peerConnection.createDataChannel("game_state", {
      ordered: false, // Para melhor performance em jogos
      maxRetransmits: 0,
    });
    this.setupDataChannelListeners();
  }
  /**
   * Configura os ouvintes do Data Channel
   */
  setupDataChannelListeners() {
    this.dataChannel.onopen = () => {
      console.log("[WebRTC] Data Channel aberto");
      this.isConnected = true;
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged(true);
      }
    };
    this.dataChannel.onmessage = (event) => {
      try {
        const gameState = JSON.parse(event.data);
        if (this.onGameStateReceived) {
          this.onGameStateReceived(gameState);
        }
      } catch (error) {
        console.error(
          "[WebRTC] Erro ao processar mensagem do Data Channel:",
          error
        );
      }
    };
    this.dataChannel.onclose = () => {
      console.log("[WebRTC] Data Channel fechado");
      this.isConnected = false;
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged(false);
      }
    };
    this.dataChannel.onerror = (error) => {
      console.error("[WebRTC] Erro no Data Channel:", error);
    };
  }
  /**
   * Cria uma oferta WebRTC
   */
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log("[WebRTC] Enviando oferta");
      this.socket.emit("offer", this.salaId, offer);
    } catch (error) {
      console.error("[WebRTC] Erro ao criar oferta:", error);
    }
  }
  /**
   * Manipula uma oferta recebida
   */
  async handleOffer(description) {
    try {
      await this.peerConnection.setRemoteDescription(description);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log("[WebRTC] Enviando resposta");
      this.socket.emit("answer", this.salaId, answer);
    } catch (error) {
      console.error("[WebRTC] Erro ao processar oferta:", error);
    }
  }
  /**
   * Manipula uma resposta recebida
   */
  async handleAnswer(description) {
    try {
      await this.peerConnection.setRemoteDescription(description);
      console.log("[WebRTC] Resposta processada com sucesso");
    } catch (error) {
      console.error("[WebRTC] Erro ao processar resposta:", error);
    }
  }
  /**
   * Manipula um candidato ICE recebido
   */
  async handleCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(candidate);
      console.log("[WebRTC] Candidato ICE adicionado");
    } catch (error) {
      console.error("[WebRTC] Erro ao adicionar candidato ICE:", error);
    }
  }
  /**
   * Envia o estado do jogo via Data Channel
   */
  sendGameState(gameState) {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      try {
        const message = JSON.stringify(gameState);
        this.dataChannel.send(message);
      } catch (error) {
        console.error("[WebRTC] Erro ao enviar estado do jogo:", error); // Fallback para Socket.IO se WebRTC falhar
        this.socket.emit("atualizacao-jogador", gameState);
      }
    } else {
      // Fallback para Socket.IO se Data Channel não estiver disponível
      this.socket.emit("atualizacao-jogador", gameState);
    }
  }
  /**
   * Define a sala atual
   */
  setSalaId(salaId) {
    this.salaId = salaId;
  }
  /**
   * Verifica se a conexão WebRTC está ativa
   */
  isWebRTCConnected() {
    return (
      this.isConnected &&
      this.dataChannel &&
      this.dataChannel.readyState === "open"
    );
  }
  /**
   * Fecha a conexão WebRTC
   */
  close() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.isConnected = false;
  }
  /**
   * Define callback para quando o estado do jogo é recebido
   */
  setOnGameStateReceived(callback) {
    this.onGameStateReceived = callback;
  }
  /**
   * Define callback para mudanças no estado da conexão
   */
  setOnConnectionStateChanged(callback) {
    this.onConnectionStateChanged = callback;
  }

  /**
   * Limpa todas as conexões WebRTC e redefine o estado
   */
  cleanup() {
    console.log("[WebRTC] Limpando conexões WebRTC");

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.isConnected = false;
    this.isInitiator = false;
    this.salaId = null;

    if (this.onConnectionStateChanged) {
      this.onConnectionStateChanged(false);
    }
  }
}
