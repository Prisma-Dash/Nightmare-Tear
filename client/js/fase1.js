export default class fase1 extends Phaser.Scene {

  constructor() {
    super('fase1');

    this.threshold = 0.1; // Força mínima do joystick para mover o personagem
    this.speed = 100; // Velocidade do personagem
    this.direcaoAtual = 'frente'; // Direção atual do personagem
  }

  init() { }

  preload() {
    this.load.tilemapTiledJSON('mapa', 'assets/mapa/mapa.json');
    this.load.image('grama_pedra', 'assets/mapa/grama_pedra.png');
    this.load.image('plantas', 'assets/mapa/plantas.png');
    this.load.spritesheet('suny', 'assets/suny.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.plugin('rexvirtualjoystickplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js', true);
  }

  create() {
    // Carregar o mapa e tilesets
    this.tilemapMapa = this.make.tilemap({ key: 'mapa' });
    const tilesetGramaPedra = this.tilemapMapa.addTilesetImage('grama_pedra', 'grama_pedra');
    const tilesetPlantas = this.tilemapMapa.addTilesetImage('plantas', 'plantas');

    // Adicionar camadas do mapa
    const camadaGramaPedra = this.tilemapMapa.createLayer('grama_pedra', tilesetGramaPedra, 0, 0);

    // Adicionar o personagem
    this.personagemLocal = this.physics.add.sprite(100, 100, 'suny');

    const camadaPlantas = this.tilemapMapa.createLayer('plantas', tilesetPlantas, 0, 0);

    // Configurar colisão para a camada de plantas
    camadaPlantas.setCollisionByProperty({ collides: true });

    // Configurar colisão entre o personagem e as plantas
    this.physics.add.collider(this.personagemLocal, camadaPlantas);

    // Configurar os limites do mapa
    this.physics.world.setBounds(0, 0, this.tilemapMapa.widthInPixels, this.tilemapMapa.heightInPixels);
    this.personagemLocal.setCollideWorldBounds(true);

    // Configurar a câmera para seguir o personagem
    this.cameras.main.startFollow(this.personagemLocal);
    this.cameras.main.setBounds(0, 0, this.tilemapMapa.widthInPixels, this.tilemapMapa.heightInPixels);

    // Animações do personagem
    this.anims.create({
      key: 'personagem-andando-direita',
      frames: this.anims.generateFrameNumbers('suny', { start: 260, end: 267 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'personagem-andando-esquerda',
      frames: this.anims.generateFrameNumbers('suny', { start: 244, end: 251 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'personagem-andando-tras',
      frames: this.anims.generateFrameNumbers('suny', { start: 236, end: 243 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'personagem-andando-frente',
      frames: this.anims.generateFrameNumbers('suny', { start: 252, end: 260 }),
      frameRate: 10,
      repeat: -1
    });

    // Configurar joystick virtual
    this.joystick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
      x: 200,
      y: 310,
      radius: 50, // Raio do joystick
      base: this.add.circle(120, 360, 50, 0x888888),
      thumb: this.add.circle(120, 360, 25, 0xcccccc)
    });
  }

  update() {
    const angle = Phaser.Math.DegToRad(this.joystick.angle); // Converte o ângulo para radianos
    const force = this.joystick.force;

    if (force > this.threshold) {
      const velocityX = Math.cos(angle) * this.speed;
      const velocityY = Math.sin(angle) * this.speed;

      this.personagemLocal.setVelocity(velocityX, velocityY);

      // Animação do personagem conforme a direção do movimento
      if (Math.abs(velocityX) > Math.abs(velocityY)) {
        if (velocityX > 0) {
          this.personagemLocal.anims.play('personagem-andando-direita', true);
          this.direcaoAtual = 'direita';
        } else {
          this.personagemLocal.anims.play('personagem-andando-esquerda', true);
          this.direcaoAtual = 'esquerda';
        }
      } else {
        if (velocityY > 0) {
          this.personagemLocal.anims.play('personagem-andando-frente', true);
          this.direcaoAtual = 'frente';
        } else {
          this.personagemLocal.anims.play('personagem-andando-tras', true);
          this.direcaoAtual = 'tras';
        }
      }
    } else {
      // Se a força do joystick for baixa, o personagem para
      this.personagemLocal.setVelocity(0);
      switch (this.direcaoAtual) {
        case 'frente':
          this.personagemLocal.anims.play('personagem-parado-frente', true);
          break;
        case 'direita':
          this.personagemLocal.anims.play('personagem-parado-direita', true);
          break;
        case 'esquerda':
          this.personagemLocal.anims.play('personagem-parado-esquerda', true);
          break;
        case 'tras':
          this.personagemLocal.anims.play('personagem-parado-tras', true);
          break;
      }
    }
  }
}
