export default class abertura extends Phaser.Scene {
  constructor() {
    super("abertura");
  }

  init(data) {}

  preload() {
    this.load.image("fundo", "assets/abertura-fundo.png");
    this.load.image("botao", "assets/UI/botao-play.png");
  }

  create() {
    const largura = this.cameras.main.width;
    const altura = this.cameras.main.height;

    this.add
      .image(largura / 2, altura / 2, "fundo")
      .setDisplaySize(largura, altura);

    this.botao = this.add
      .image(largura / 2, altura * 0.75, "botao")
      .setScale(0.25)
      .setInteractive()
      .on("pointerdown", () => {
    
        this.scene.start("precarregamento");
      });
  }

  update() {}
}