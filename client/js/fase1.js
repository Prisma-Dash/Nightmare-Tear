export default class fase1 extends Phaser.Scene {

  constructor() {

    super('fase1')

  }

  init() {

  }

  preload() {


    this.load.tilemapTiledJSON('mapa', 'assets/mapa/mapa.json')
    this.load.image('grama_pedra', 'assets/mapa/grama_pedra.png')


    this.load.spritesheet('suny', 'assets/suny.png', {
      frameWidth: 64,
      frameHeight: 64
    })

  }

  create() {

    this.suny = this.physics.add.sprite(100, 100, 'suny')


    this.anims.create({
      key: 'suny-direita',
      frames: this.anims.generateFrameNumbers('suny', { start: 260, end: 267 }),
      frameRate: 10,
      repeat: -1
    })


    this.tilemapMapa = this.make.tilemap({ key: 'mapa' });
    this.tilesetgrama_pedra = this.tilemapMapa.addTilesetImage('grama_pedra');

    this.layerChao = this.tilemapMapa.createLayer('chao', this.tilesetgrama_pedra);


    this.anims.create({
      key: 'botao',
      frames: this.anims.generateFrameNumbers('botao', { start: 0, end: 7 }),
      frameRate: 30
    })

    this.botao = this.add.sprite(400, 300, 'botao')

    this.botao
      .setInteractive()
      .on('pointerdown', () => {
        //this.botao.play('botao')
        this.suny.play('suny-direita')
        this.suny.setVelocityX(100)
      })

  }


  update() {

  }

}