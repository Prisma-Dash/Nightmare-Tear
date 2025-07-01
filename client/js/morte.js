export default class morte extends Phaser.Scene {
  constructor() {
    super("morte");
    this.playerFromFase1Data = null;
    this.recreatedPlayer = null;
    this.blackOverlay = null;
  }

  init(data) {
    if (data && data.playerData) {
      this.playerFromFase1Data = data.playerData;
    }
  }

  preload() {
    this.load.image("mensagem_morte", "assets/morte/mensagem.png");
    this.load.image("botao_home", "assets/morte/botao_home.png");

    this.load.spritesheet("suny", "assets/suny.png", {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet("nephis", "assets/nephis.png", {
      frameWidth: 64,
      frameHeight: 64,
    });

    // As imagens já foram pré-carregadas na cena 'precarregamento'
    // Apenas por garantia, caso a cena seja acessada diretamente:
    this.load.image("suny_morte", "assets/morte/suny_morte.png");
    this.load.image("nephis_morte", "assets/morte/nephis_morte.png");
  }

  create() {
    const largura = this.cameras.main.width;
    const altura = this.cameras.main.height;

    this.blackOverlay = this.add
      .rectangle(largura / 2, altura / 2, largura, altura, 0x000000)
      .setOrigin(0.5)
      .setAlpha(0)
      .setScrollFactor(0)
      .setDepth(90);

    if (this.playerFromFase1Data) {
      const playerKey = this.playerFromFase1Data.isSuny ? "suny" : "nephis";

      this.recreatedPlayer = this.add
        .sprite(
          largura / 2,
          altura / 2,
          playerKey,
          this.playerFromFase1Data.frame
        )
        .setTint(this.playerFromFase1Data.tint)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(95);
    }

    this.tweens.add({
      targets: this.blackOverlay,
      alpha: 0.7,
      duration: 1500,
      ease: "Power2",
    });

    // --- LÓGICA PRINCIPAL DA CORREÇÃO ---
    // Determina qual imagem de morte usar com base nos dados recebidos.
    const imagemMorteKey =
      this.playerFromFase1Data && !this.playerFromFase1Data.isSuny
        ? "nephis_morte"
        : "suny_morte";

    // Usa a variável 'imagemMorteKey' em vez de um valor fixo.
    const mensagemMorte = this.add
      .image(largura / 2, altura * 0.25, imagemMorteKey)
      .setAlpha(0)
      .setScale(0.2)
      .setDepth(100);

    this.tweens.add({
      targets: mensagemMorte,
      alpha: 1,
      duration: 1500,
      ease: "Power2",
    });

    const botaoHome = this.add
      .image(largura / 2, altura * 0.85, "botao_home")
      .setInteractive()
      .setScale(0.05)
      .setDepth(100);

    botaoHome.on("pointerdown", () => {
      this.tweens.add({
        targets: [
          this.blackOverlay,
          mensagemMorte,
          botaoHome,
          this.recreatedPlayer,
        ],
        alpha: 0,
        duration: 1000,
        ease: "Power2",
        onComplete: () => {
          this.scene.stop("morte");
          this.scene.start("abertura");
        },
      });
    });

    this.cameras.main.setBackgroundColor("#000");

    let imagemMorte;
    if (this.personagem === "suny") {
      imagemMorte = this.add.image(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        "suny_morte"
      );
    } else if (this.personagem === "nephis") {
      imagemMorte = this.add.image(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        "nephis_morte"
      );
    }

    if (imagemMorte) {
      imagemMorte.setOrigin(0.5, 0.5);
      imagemMorte.setScale(
        Math.min(
          this.cameras.main.width / imagemMorte.width,
          this.cameras.main.height / imagemMorte.height
        )
      );
    }
  }

  update() {}
}
