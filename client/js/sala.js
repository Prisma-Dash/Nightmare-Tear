export default class sala extends Phaser.Scene {
  constructor() {
    super("sala");
    this.statusText = null;
    this.roomButtons = [];
  }

  init() {
    if (!this.game.socket) {
      console.error("Socket não encontrado.");
    }
  }

  preload() {
    this.load.image("abertura-fundo", "assets/abertura-fundo.png");
  }

  create() {
    this.game.socket.removeAllListeners();

    const largura = this.cameras.main.width;
    const altura = this.cameras.main.height;

    this.add
      .image(largura / 2, altura / 2, "abertura-fundo")
      .setDisplaySize(largura, altura)
      .setDepth(0);

    this.statusText = this.add
      .text(largura / 2, altura * 0.9, "Escolha sua sala.", {
        fontSize: "18px",
        fill: "#eee",
      })
      .setOrigin(0.5)
      .setDepth(1);

    if (!this.game.socket.connected) {
      this.statusText.setText(
        "Erro: Não foi possível conectar. Tente recarregar a página."
      );
      return;
    }

    this.game.socket.on("iniciar-jogo", (jogadores) => {
      this.statusText.setText("Jogador 2 encontrado! Iniciando...");
      
      // Criar tela escura
      const overlay = this.add.rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        1
      ).setDepth(1000);

      // Texto que aparece letra por letra
      const fraseCompleta = "sobreviva e acorde...";
      let textoAtual = "";
      let indiceLetra = 0;

      const textoAnimado = this.add.text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        "",
        {
          fontSize: "32px",
          fontFamily: "monospace",
          color: "#ffffff",
          fontStyle: "bold",
        }
      ).setOrigin(0.5).setDepth(1001);

      // Função para adicionar letra por letra
      const adicionarLetra = () => {
        if (indiceLetra < fraseCompleta.length) {
          textoAtual += fraseCompleta[indiceLetra];
          textoAnimado.setText(textoAtual);
          indiceLetra++;
          this.time.delayedCall(100, adicionarLetra);
        } else {
          // Após terminar a frase, aguardar 2 segundos e iniciar o jogo
          this.time.delayedCall(2000, () => {
            this.scene.start("fase1", { jogadores });
          });
        }
      };

      // Iniciar a animação da frase
      this.time.delayedCall(500, adicionarLetra);
    });

    const buttonWidth = 120,
      buttonHeight = 40;
    const totalRooms = 10;
    const roomsPerColumn = 5;
    const paddingX = 20,
      paddingY = 15;
    const borderRadius = 10;

    const totalContentWidth =
      buttonWidth * roomsPerColumn + paddingX * (roomsPerColumn - 1);
    const startX = (largura - totalContentWidth) / 2 + buttonWidth / 2;
    const startY = altura * 0.55 + buttonHeight / 2;

    for (let i = 0; i < totalRooms; i++) {
      const roomNumber = i + 1;
      const col = i % roomsPerColumn;
      const row = Math.floor(i / roomsPerColumn);

      const buttonX = startX + col * (buttonWidth + paddingX);
      const buttonY = startY + row * (buttonHeight + paddingY);

      const zone = this.add
        .zone(buttonX, buttonY, buttonWidth, buttonHeight)
        .setOrigin(0.5)
        .setInteractive();

      const buttonGraphics = this.add.graphics();
      buttonGraphics.x = buttonX;
      buttonGraphics.y = buttonY;

      buttonGraphics.fillStyle(0x000000, 1);
      buttonGraphics.fillRoundedRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        borderRadius
      );
      buttonGraphics.fillStyle(0x888888, 1);
      buttonGraphics.fillRoundedRect(
        -buttonWidth / 2 + 2,
        -buttonHeight / 2 + 2,
        buttonWidth - 4,
        buttonHeight - 4,
        borderRadius - 2
      );
      buttonGraphics.fillStyle(0x333333, 1);
      buttonGraphics.fillRoundedRect(
        -buttonWidth / 2 + 4,
        -buttonHeight / 2 + 4,
        buttonWidth - 8,
        buttonHeight - 8,
        borderRadius - 4
      );

      const buttonText = this.add
        .text(buttonX, buttonY, `Sala ${roomNumber}`, {
          fontSize: "24px",
          fill: "#5B6D82",
        })
        .setOrigin(0.5);

      zone.on("pointerdown", () => {
        this.statusText.setText(
          `Entrando na Sala ${roomNumber}... Esperando jogador 2.`
        );

        // Definir a sala no WebRTC Manager
        this.game.webRTCManager.setSalaId(roomNumber);

        this.game.socket.emit("entrar-na-sala", roomNumber);

        this.roomButtons.forEach((zone) => zone.disableInteractive());
      });

      zone.on("pointerover", () => {
        buttonGraphics.clear();
        buttonGraphics.fillStyle(0x000000, 1);
        buttonGraphics.fillRoundedRect(
          -buttonWidth / 2,
          -buttonHeight / 2,
          buttonWidth,
          buttonHeight,
          borderRadius
        );
        buttonGraphics.fillStyle(0xaaaaaa, 1);
        buttonGraphics.fillRoundedRect(
          -buttonWidth / 2 + 2,
          -buttonHeight / 2 + 2,
          buttonWidth - 4,
          buttonHeight - 4,
          borderRadius - 2
        );
        buttonGraphics.fillStyle(0x555555, 1);
        buttonGraphics.fillRoundedRect(
          -buttonWidth / 2 + 4,
          -buttonHeight / 2 + 4,
          buttonWidth - 8,
          buttonHeight - 8,
          borderRadius - 4
        );
      });

      zone.on("pointerout", () => {
        buttonGraphics.clear();
        buttonGraphics.fillStyle(0x000000, 1);
        buttonGraphics.fillRoundedRect(
          -buttonWidth / 2,
          -buttonHeight / 2,
          buttonWidth,
          buttonHeight,
          borderRadius
        );
        buttonGraphics.fillStyle(0x888888, 1);
        buttonGraphics.fillRoundedRect(
          -buttonWidth / 2 + 2,
          -buttonHeight / 2 + 2,
          buttonWidth - 4,
          buttonHeight - 4,
          borderRadius - 2
        );
        buttonGraphics.fillStyle(0x333333, 1);
        buttonGraphics.fillRoundedRect(
          -buttonWidth / 2 + 4,
          -buttonHeight / 2 + 4,
          buttonWidth - 8,
          buttonHeight - 8,
          borderRadius - 4
        );
      });

      this.roomButtons.push(zone);
    }

    this.game.socket.on("sala-cheia", () => {
      this.statusText.setText("A sala escolhida está cheia. Tente outra.");
      this.roomButtons.forEach((zone) => zone.setInteractive());
    });

    this.game.socket.on("resetar-sala", () => {
      console.log("[Sala] Recebido comando para resetar sala. Reiniciando cena.");
      this.scene.restart(); // Reinicia a cena 'sala' para permitir nova escolha de sala
    });
  }
}
