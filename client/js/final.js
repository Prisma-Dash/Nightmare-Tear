export default class final extends Phaser.Scene {
  constructor() {
    super("final");
    this.vitoria = false;
    this.personagem = "suny";
    this.score = 0;
    this.currentMessage = 0;
    this.messages = ["muito bem!", "você acordou!"];
    this.scoreAnimating = false;
    this.currentScore = 0;
  }

  init(data) {
    if (data) {
      this.vitoria = data.vitoria || false;
      this.personagem = data.personagem || "suny";
      this.score = data.score || 0;
    }
  }

  preload() {
    this.load.image("nephis_win", "assets/nephis_win.png");
    this.load.image("suny_win", "assets/suny_win.png");
    this.load.image("botao_home", "assets/morte/botao_home.png");
  }

  create() {
    const largura = this.cameras.main.width;
    const altura = this.cameras.main.height;

    // Escolher a imagem de fundo baseada no personagem
    const imagemFundo =
      this.personagem === "nephis" ? "nephis_win" : "suny_win";

    this.add
      .image(largura / 2, altura / 2, imagemFundo)
      .setDisplaySize(largura, altura)
      .setDepth(0);

    // Texto da primeira mensagem
    this.messageText = this.add
      .text(largura / 2, altura * 0.2, "", {
        fontSize: "36px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(1);

    // Texto do score (inicialmente invisível)
    this.scoreText = this.add
      .text(largura / 2, altura * 0.4, "", {
        fontSize: "28px",
        fontFamily: "monospace",
        color: "#ffff00",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(1)
      .setVisible(false);

    // Botão home (inicialmente invisível)
    this.homeButton = this.add
      .image(largura / 2, altura * 0.8, "botao_home")
      .setScale(0.05)
      .setInteractive()
      .setDepth(1)
      .setVisible(false);

    this.homeButton.on("pointerdown", () => {
      this.voltarParaAbertura();
    });
  
    // Iniciar a sequência de mensagens
    this.mostrarProximaMensagem();

    globalThis.google.accounts.id.initialize({
      client_id:
        "331191695151-ku8mdhd76pc2k36itas8lm722krn0u64.apps.googleusercontent.com",
      callback: (res) => {
        if (res.error) {
          console.error(res.error);
        } else {
          axios
            .post(
              "https://feira-de-jogos.dev.br/api/v2/credit",
              {
                product: 47, // id do jogo cadastrado no banco de dados da Feira de Jogos
                value: 200, // crédito em tijolinhos
              },
              {
                headers: {
                  Authorization: `Bearer ${res.credential}`,
                },
              }
            )
            .then(function (response) {
              console.log(response);
            })
            .catch(function (error) {
              console.error(error);
            });
        }
      },
    });

    globalThis.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        globalThis.google.accounts.id.prompt();
      }
    });
  }

  mostrarProximaMensagem() {
    if (this.currentMessage < this.messages.length) {
      const mensagem = this.messages[this.currentMessage];
      this.messageText.setText(mensagem);

      this.currentMessage++;

      // Aguardar 3 segundos e mostrar próxima mensagem
      this.time.delayedCall(3000, () => {
        this.mostrarProximaMensagem();
      });
    } else {
      // Todas as mensagens foram mostradas, agora mostrar o score
      this.mostrarScore();
    }
  }

  mostrarScore() {
    this.messageText.setText(""); // Limpar mensagem anterior
    this.scoreText.setVisible(true);
    this.scoreText.setText("Score: 0");

    this.scoreAnimating = true;
    this.currentScore = 0;

    // Animar o score subindo
    this.animarScore();
  }

  animarScore() {
    if (this.currentScore < this.score) {
      const incremento = Math.max(1, Math.floor(this.score / 50));
      this.currentScore = Math.min(this.currentScore + incremento, this.score);
      this.scoreText.setText(`Score: ${this.currentScore}`);

      this.time.delayedCall(50, () => {
        this.animarScore();
      });
    } else {
      // Score animation finished, show home button
      this.scoreAnimating = false;
      this.time.delayedCall(1000, () => {
        this.homeButton.setVisible(true);
      });
    }
  }

  voltarParaAbertura() {
    // Resetar o socket se existir
    if (this.game.socket) {
      this.game.socket.emit("sair-da-sala");
      this.game.socket.removeAllListeners();
    }

    // Voltar para a abertura
    this.scene.start("abertura");
  }
}
