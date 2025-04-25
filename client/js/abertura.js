export default class abertura extends Phaser.Scene {

    constructor() {

        super('abertura')

    }

    init() {

    }

    preload() {

        this.load.image('fundo', 'assets/abertura-fundo.png')
        this.load.image('botao', 'assets/botao-play.png')

    }

    create() {
        this.add.image(400, 225, 'fundo')
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.start('precarregamento')
            })

        this.botao = this.add.image(400, 375, 'botao')
            .setScale(0.25) // Define a escala para 25%
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.start('fase1')
            })
    }



    update() {

    }

}