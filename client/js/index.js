import config from "./config.js";
import abertura from "./abertura.js";
import precarregamento from "./precarregamento.js";
import sala from "./sala.js";
import fase1 from "./fase1.js";
import final from "./final.js";
import morte from "./morte.js";
import controle from "./controle.js";
import WebRTCManager from "./WebRTCManager.js";

class Game extends Phaser.Game {
  constructor() {
    super(config);

    this.audio = document.querySelector("audio");
    this.iceServers = {
      iceServers: [
        {
          urls: "stun:feira-de-jogos.dev.br",
        },
        {
          urls: "turns:feira-de-jogos.dev.br",
          username: "adc20251",
          credential: "adc20251",
        },
        {
          urls: "stun:stun.1.google.com:19302",
        },
      ],
    };

    this.socket = io();

    this.socket.on("connect", () => {
      console.log(`Usuário ${this.socket.id} conectado no servidor`);
    });
    
    this.scene.add("abertura", abertura);
    this.scene.add("precarregamento", precarregamento);
    this.scene.add("sala", sala);
    this.scene.add("fase1", fase1);
    this.scene.add("controle", controle);
    this.scene.add("final", final);
    this.scene.add("morte", morte);

    this.socket = io();

    this.webRTCManager = new WebRTCManager(this.socket);

    this.socket.on("connect", () => {
      console.log("Conectado ao servidor Socket.IO");
    });

    this.socket.on("disconnect", () => {
      console.log("Desconectado do servidor Socket.IO");
      this.webRTCManager.close();
    });

    this.scene.start("abertura");
  }
}

window.onload = () => {
  window.game = new Game();
};
