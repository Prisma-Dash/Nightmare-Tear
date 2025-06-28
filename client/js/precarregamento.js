export default class precarregamento extends Phaser.Scene {
  constructor() {
    super("precarregamento");
  }

  init() {
    this.add.rectangle(400, 300, 468, 32, 0xffffff);
    const progresso = this.add.rectangle(400 - 230, 300, 4, 28, 0x000000);

    this.load.on("progress", (progress) => {
      progresso.width = 4 + 460 * progress;
    });
  }

  preload() {
    this.load.setPath("assets/");
    this.load.image("fundo", "abertura-fundo.png");
    this.load.spritesheet("suny", "suny.png", {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet("nephis", "nephis.png", {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet("mob_skeleton", "mob_skeleton_universal.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.tilemapTiledJSON("mapa1", "mapa/mapa1.json");
    this.load.image("chao_pedra", "mapa/chao_pedra.png");
    this.load.image("chao_rua", "mapa/chao_rua.png");
    this.load.image("ruinas", "mapa/ruinas.png");
    this.load.image("arvores1", "mapa/arvore1.png");
    this.load.image("lava", "mapa/chao_lava.png");
    this.load.image("full_screen", "UI/full_screen.png");
  }

  create() {
    this.scene.start("sala");
  }
}