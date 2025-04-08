import config from "./config.js"
import abertura from "./abertura.js"
import precarregamento from "./precarregamento.js"
import sala from "./sala.js"
import fase from "./fase1.js"
import final from "./final.js"
import morte from "./morte.js"
import fase1 from "./fase1.js"



class Game extends Phaser.Game {

    constructor() {
        super(config)

        this.scene.add('abertura', abertura)
        this.scene.add('precarregamento', precarregamento)
        this.scene.add('sala', sala)
        this.scene.add('fase1', fase1)
        this.scene.add('final', final)
        this.scene.add('morte', morte)
        this.scene.start('abertura')

    }
}


window.onload = () => {
    window.game = new Game()
}

