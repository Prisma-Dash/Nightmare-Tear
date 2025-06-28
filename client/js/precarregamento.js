export default class precarregamento extends Phaser.Scene {

  constructor() {

    super('precarregamento')

  }

  init() {
    this.add.rectangle(400, 300, 468, 32, 0xfffffff)
    const progresso = this.add.rectangle(400 - 230, 300, 4, 28, 0xfffffff)
    this.load.on('progress', (progress) => {
      progresso.witdh = 4 + (460 * progress)
    })
  }

  preload() {


    this.load.setPath('assets/')
    this.load.image('fundo', 'abertura-fundo.png')
    this.load.spritesheet('suny', 'suny.png', {
      frameWidth: 64,
      frameHeight: 64
    })

  }

  create() {


    this.scene.start('sala')

  }

  update() {

  }

}