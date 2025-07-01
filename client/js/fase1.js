export default class fase1 extends Phaser.Scene {
  constructor() {
    super("fase1");

    this.threshold = 0.1;
    this.speed = 350;
    this.direcaoAtual = "frente";
    this.personagemLocal = null;
    this.controleScene = null;
    this.sunyActive = false;

    this.nephisLocal = null;
    this.nephisSpeed = 350;
    this.nephisDirecaoAtual = "frente";
    this.nephisKeys = null;
    this.nephisActive = false;

    this.enemies = null;
    this.SKELETON_ATTACK_RANGE = 50;

    this.maxSkeletons = 5;
    this.currentSkeletons = 0;
    this.totalSkeletonsSpawned = 0;

    this.barConfig = {
      width: 40,
      height: 6,
      yOffset: 8,
      healthColor: 0x00ff00,
      damageColor: 0xff0000,
    };
    this.assignedCharacter = null;
    this.currentRoomNumber = null;

    this.outrosJogadores = {};
    this.socket = null;
    this.jogadoresInfo = null;
  }

  init(data) {
    if (data && data.jogadores) {
      this.jogadoresInfo = data.jogadores;

      const meuSocketId = this.game.socket.id;
      const meuJogador = this.jogadoresInfo[meuSocketId];

      if (meuJogador) {
        this.assignedCharacter = meuJogador.personagem;
        this.currentRoomNumber = meuJogador.salaId || 1;
        this.sunyActive = this.assignedCharacter === "suny";
        this.nephisActive = this.assignedCharacter === "nephis";
      }
    } else {
      // fallback para testes
      this.assignedCharacter = "suny";
      this.currentRoomNumber = 1;
      this.sunyActive = true;
      this.nephisActive = false;
    }
  }

  preload() {
    this.load.spritesheet("suny", "assets/suny.png", {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet("nephis", "assets/nephis.png", {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet("mob_skeleton", "assets/mob_skeleton_universal.png", {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.tilemapTiledJSON("mapa1", "assets/mapa/mapa1.json");
    this.load.image("chao_pedra", "assets/mapa/chao_pedra.png");
    this.load.image("chao_rua", "assets/mapa/chao_rua.png");
    this.load.image("ruinas", "assets/mapa/ruinas.png");
    this.load.image("arvores1", "assets/mapa/arvore1.png");
    this.load.image("lava", "assets/mapa/chao_lava.png");

    this.load.image("full_screen", "assets/full_screen.png");
  }

  create() {
    this.tilemapMapa = this.make.tilemap({ key: "mapa1" });
    const tilesets = [
      this.tilemapMapa.addTilesetImage("chao_pedra", "chao_pedra"),
      this.tilemapMapa.addTilesetImage("chao_rua", "chao_rua"),
      this.tilemapMapa.addTilesetImage("ruinas", "ruinas"),
      this.tilemapMapa.addTilesetImage("arvores1", "arvores1"),
      this.tilemapMapa.addTilesetImage("lava", "lava"),
    ];

    const camadaChao = this.tilemapMapa.createLayer("chao", tilesets, 0, 0);
    const camadaArvore = this.tilemapMapa.createLayer("arvore", tilesets, 0, 0);
    const camadaMontanha = this.tilemapMapa.createLayer(
      "montanha",
      tilesets,
      0,
      0
    );
    const camadaMontanha2 = this.tilemapMapa.createLayer(
      "montanha2",
      tilesets,
      0,
      0
    );

    camadaChao.setDepth(0);
    camadaMontanha.setDepth(1);
    camadaMontanha2.setDepth(1.5);
    camadaArvore.setDepth(10);

    const centerX = this.tilemapMapa.widthInPixels / 2;
    const centerY = this.tilemapMapa.heightInPixels / 2;

    this.personagemLocal = this.physics.add.sprite(centerX, centerY, "suny");
    this.personagemLocal.setCollideWorldBounds(true);
    this.personagemLocal.vidaMaxima = 200;
    this.personagemLocal.vidaAtual = 200;
    this.personagemLocal.healthBar = this.criarBarraDeVida();
    this.personagemLocal.setDepth(2.5);

    this.personagemLocal.setVisible(this.sunyActive);
    this.personagemLocal.body.enable = this.sunyActive;

    const nephisSpawnX = centerX + 100;
    const nephisSpawnY = centerY;
    this.nephisLocal = this.physics.add.sprite(
      nephisSpawnX,
      nephisSpawnY,
      "nephis"
    );
    this.nephisLocal.setCollideWorldBounds(true);
    this.nephisLocal.vidaMaxima = 200;
    this.nephisLocal.vidaAtual = 200;
    this.nephisLocal.healthBar = this.criarBarraDeVida();
    this.nephisLocal.setDepth(2.5);

    this.nephisLocal.setVisible(this.nephisActive);
    this.nephisLocal.body.enable = this.nephisActive;

    this.meuPersonagem = this.sunyActive
      ? this.personagemLocal
      : this.nephisLocal;

    camadaArvore.setCollisionByProperty({ collider: true });
    camadaMontanha.setCollisionByProperty({ collider: true });
    camadaMontanha2.setCollisionByProperty({ collider: true });

    this.physics.add.collider(this.personagemLocal, [
      camadaArvore,
      camadaMontanha,
      camadaMontanha2,
    ]);
    this.physics.add.collider(this.nephisLocal, [
      camadaArvore,
      camadaMontanha,
      camadaMontanha2,
    ]);
    this.physics.add.collider(this.personagemLocal, this.nephisLocal);

    this.criarAnimacoesPersonagem();
    this.criarAnimacoesNephis();
    this.criarAnimacoesEsqueleto();

    this.enemies = this.physics.add.group();
    this.physics.add.collider(this.enemies, [
      camadaArvore,
      camadaMontanha,
      camadaMontanha2,
    ]);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(
      this.personagemLocal,
      this.enemies,
      this.handlePlayerSkeletonOverlap,
      null,
      this
    );
    this.physics.add.overlap(
      this.nephisLocal,
      this.enemies,
      this.handlePlayerSkeletonOverlap,
      null,
      this
    );

    this.adicionarEsqueleto(3400, 550);

    this.scene.launch("controle");
    this.controleScene = this.scene.get("controle");

    if (this.assignedCharacter === "nephis") {
      if (
        this.controleScene &&
        typeof this.controleScene.hideJoystick === "function"
      ) {
        this.controleScene.hideJoystick();
      }
    } else {
      if (
        this.controleScene &&
        typeof this.controleScene.showJoystick === "function"
      ) {
        this.controleScene.showJoystick();
      }
    }

    this.physics.world.setBounds(
      0,
      0,
      this.tilemapMapa.widthInPixels,
      this.tilemapMapa.heightInPixels
    );

    if (this.assignedCharacter === "suny") {
      this.cameras.main.startFollow(this.personagemLocal);
    } else if (this.assignedCharacter === "nephis") {
      this.cameras.main.startFollow(this.nephisLocal);
    }
    this.cameras.main.setBounds(
      0,
      0,
      this.tilemapMapa.widthInPixels,
      this.tilemapMapa.heightInPixels
    );

    this.input.keyboard.on("keydown-H", () => {
      if (this.sunyActive) this.receberDano(this.personagemLocal, 20);
    });

    this.input.keyboard.on("keydown-C", (event) => {
      if (
        this.sunyActive &&
        (event.key === "ç" ||
          event.key === "Ç" ||
          event.key === "c" ||
          event.key === "C")
      ) {
        const primeiroInimigo = this.enemies.getFirstAlive();
        if (primeiroInimigo) {
          this.receberDano(primeiroInimigo, 20);
        }
      }
    });

    this.nephisKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      damage: Phaser.Input.Keyboard.KeyCodes.J,
    });

    if (this.nephisActive) {
      this.nephisKeys.damage.on("down", () =>
        this.receberDano(this.nephisLocal, 20)
      );
    }

    const fullscreenButton = this.add
      .image(this.cameras.main.width - 40, 40, "full_screen")
      .setOrigin(0.5)
      .setInteractive()
      .setScale(0.05)
      .setScrollFactor(0)
      .setDepth(1001);

    fullscreenButton.on("pointerdown", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });

    if (this.game.socket) {
      this.game.socket.off("estadoDaSala");
      this.game.socket.off("novoJogadorNaSala");
      this.game.socket.off("outro-jogador-atualizado");
      this.game.socket.off("jogador-desconectado");

      this.game.socket.on("estadoDaSala", (jogadoresNaSala) => {
        Object.values(jogadoresNaSala).forEach((jogadorInfo) => {
          if (jogadorInfo.id === this.game.socket.id) {
            this.assignedCharacter = jogadorInfo.personagem;
            this.criarJogadorLocal(jogadorInfo);
          } else {
            this.criarOutroJogador(jogadorInfo);
          }
        });
      });

      this.game.socket.on("novoJogadorNaSala", (jogadorInfo) => {
        if (jogadorInfo.id !== this.game.socket.id) {
          this.criarOutroJogador(jogadorInfo);
        }
      });

      this.game.socket.on("outro-jogador-atualizado", (jogadorInfo) => {
        const outro = this.outrosJogadores[jogadorInfo.id];
        if (outro) {
          outro.setPosition(jogadorInfo.x, jogadorInfo.y);
          outro.anims.play(jogadorInfo.anim, true);
          outro.vidaAtual = jogadorInfo.vida;
        }
      });

      this.game.socket.on("jogador-desconectado", (jogadorId) => {
        if (this.outrosJogadores[jogadorId]) {
          this.outrosJogadores[jogadorId].destroy();
          delete this.outrosJogadores[jogadorId];
        }
      });
    }

    this.game.events.off("hidden", this.game.loop.sleep, this.game.loop);
    this.game.events.off("visible", this.game.loop.wake, this.game.loop);

    if (this.jogadoresInfo) {
      Object.values(this.jogadoresInfo).forEach((jogadorInfo) => {
        if (
          jogadorInfo &&
          jogadorInfo.id &&
          jogadorInfo.id !== this.game.socket.id
        ) {
          this.criarOutroJogador(jogadorInfo);
        }
      });
    }
  }

  criarBarraDeVida() {
    const healthBar = {
      bg: this.add.graphics(),
      fg: this.add.graphics(),
    };
    healthBar.bg.setVisible(false);
    healthBar.fg.setVisible(false);
    return healthBar;
  }

  atualizarBarraVida(personagem) {
    if (
      !personagem.active ||
      !personagem.healthBar ||
      !personagem.healthBar.bg.visible
    )
      return;
    const barX = personagem.x - this.barConfig.width / 2;
    const barY =
      personagem.y -
      personagem.displayHeight / 2 -
      this.barConfig.yOffset -
      this.barConfig.height;
    personagem.healthBar.bg.setPosition(barX, barY);
    personagem.healthBar.fg.setPosition(barX, barY);
    const percentualVida = Phaser.Math.Clamp(
      personagem.vidaAtual / personagem.vidaMaxima,
      0,
      1
    );
    personagem.healthBar.bg.clear();
    personagem.healthBar.bg.fillStyle(this.barConfig.damageColor, 0.7);
    personagem.healthBar.bg.fillRect(
      0,
      0,
      this.barConfig.width,
      this.barConfig.height
    );
    personagem.healthBar.fg.clear();
    personagem.healthBar.fg.fillStyle(this.barConfig.healthColor, 1);
    personagem.healthBar.fg.fillRect(
      0,
      0,
      this.barConfig.width * percentualVida,
      this.barConfig.height
    );
    personagem.healthBar.bg.setDepth(personagem.depth + 1);
    personagem.healthBar.fg.setDepth(personagem.depth + 2);
  }

  receberDano(personagem, quantidade) {
    if (
      !personagem.active ||
      typeof personagem.vidaAtual === "undefined" ||
      personagem.vidaAtual <= 0
    )
      return;
    personagem.vidaAtual -= quantidade;
    if (personagem.vidaAtual < 0) personagem.vidaAtual = 0;
    console.log(
      `Vida de ${personagem.texture.key}: ${personagem.vidaAtual}/${personagem.vidaMaxima}`
    );
    if (personagem.healthBar) {
      personagem.healthBar.bg.setVisible(true);
      personagem.healthBar.fg.setVisible(true);
      this.atualizarBarraVida(personagem);
    }
    if (personagem.vidaAtual <= 0) {
      console.log(`${personagem.texture.key} morreu!`);
      personagem.setTint(0xff0000);

      // Só o cliente do personagem morto avisa o servidor
      if (personagem === this.meuPersonagem) {
        this.physics.world.pause();
        if (
          this.controleScene &&
          typeof this.controleScene.hideJoystick === "function"
        ) {
          this.controleScene.hideJoystick();
        }
        if (this.game.socket) {
          this.game.socket.emit("jogador-morreu", {
            personagem: this.assignedCharacter,
          });
        }

        let deathAnimationKey = "";
        if (personagem === this.personagemLocal) {
          deathAnimationKey = "personagem-morte";
        } else if (personagem === this.nephisLocal) {
          deathAnimationKey = "nephis-morte";
        }

        personagem.anims.play(deathAnimationKey, true);

        const playerData = {
          x: personagem.x,
          y: personagem.y,
          frame: 209,
          tint: personagem.tintTopLeft,
          isSuny: personagem === this.personagemLocal,
        };

        // Aguarda 2.5 segundos e transiciona para a cena de morte
        this.time.delayedCall(
          2500,
          () => {
            this.scene.stop("fase1");
            this.scene.start("morte", { playerData: playerData });
          },
          [],
          this
        );
      } else {
        personagem.anims.stop();
        if (personagem.texture.key === "mob_skeleton") {
          this.currentSkeletons--;
          if (this.currentSkeletons < this.maxSkeletons) {
            this.time.delayedCall(
              1000,
              () => {
                const spawnX = Phaser.Math.Between(
                  100,
                  this.tilemapMapa.widthInPixels - 100
                );
                const spawnY = Phaser.Math.Between(
                  100,
                  this.tilemapMapa.heightInPixels - 100
                );
                this.adicionarEsqueleto(spawnX, spawnY);
              },
              [],
              this
            );
          }
        }

        this.time.delayedCall(500, () => {
          if (personagem.healthBar) {
            personagem.healthBar.bg.destroy();
            personagem.healthBar.fg.destroy();
          }
          personagem.destroy();
        });
      }
    }
  }

  criarAnimacoesPersonagem() {
    this.anims.create({
      key: "personagem-andando-direita",
      frames: this.anims.generateFrameNumbers("suny", { start: 94, end: 103 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "personagem-andando-esquerda",
      frames: this.anims.generateFrameNumbers("suny", { start: 72, end: 81 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "personagem-andando-tras",
      frames: this.anims.generateFrameNumbers("suny", { start: 61, end: 70 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "personagem-andando-frente",
      frames: this.anims.generateFrameNumbers("suny", { start: 83, end: 92 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "personagem-parado-frente",
      frames: [{ key: "suny", frame: 82 }],
      frameRate: 1,
      repeat: 0,
    });
    this.anims.create({
      key: "personagem-morte",
      frames: this.anims.generateFrameNumbers("suny", { start: 204, end: 209 }),
      frameRate: 10,
      repeat: 0,
    });
  }

  criarAnimacoesNephis() {
    this.anims.create({
      key: "nephis-andando-direita",
      frames: this.anims.generateFrameNumbers("nephis", {
        start: 94,
        end: 103,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "nephis-andando-esquerda",
      frames: this.anims.generateFrameNumbers("nephis", { start: 72, end: 81 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "nephis-andando-tras",
      frames: this.anims.generateFrameNumbers("nephis", { start: 61, end: 70 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "nephis-andando-frente",
      frames: this.anims.generateFrameNumbers("nephis", { start: 83, end: 92 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "nephis-parado-frente",
      frames: [{ key: "nephis", frame: 82 }],
      frameRate: 1,
      repeat: 0,
    });
    this.anims.create({
      key: "nephis-morte",
      frames: this.anims.generateFrameNumbers("nephis", {
        start: 204,
        end: 209,
      }),
      frameRate: 10,
      repeat: 0,
    });
  }

  criarAnimacoesEsqueleto() {
    const SKELETON_KEY = "mob_skeleton";

    this.anims.create({
      key: "skeleton-andando-direita",
      frames: this.anims.generateFrameNumbers(SKELETON_KEY, {
        start: 94,
        end: 104,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "skeleton-andando-esquerda",
      frames: this.anims.generateFrameNumbers(SKELETON_KEY, {
        start: 72,
        end: 82,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "skeleton-andando-tras",
      frames: this.anims.generateFrameNumbers(SKELETON_KEY, {
        start: 83,
        end: 93,
      }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "skeleton-andando-frente",
      frames: this.anims.generateFrameNumbers(SKELETON_KEY, {
        start: 105,
        end: 115,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }

  adicionarEsqueleto(x, y) {
    if (this.currentSkeletons >= this.maxSkeletons) {
      console.log(
        "Número máximo de esqueletos atingido. Não é possível adicionar mais."
      );
      return;
    }

    const skeleton = this.enemies.create(x, y, "mob_skeleton");

    if (!skeleton) {
      console.error(
        "[ERRO CRÍTICO] O objeto esqueleto não foi criado! Verifique se 'mob_skeleton' foi carregado corretamente no preload() e se o asset está disponível no caminho."
      );
      return;
    }

    skeleton.setCollideWorldBounds(true);
    skeleton.setDepth(this.personagemLocal.depth);

    skeleton.vidaMaxima = 100;
    skeleton.vidaAtual = 100;
    skeleton.healthBar = this.criarBarraDeVida();
    this.currentSkeletons++;
    this.totalSkeletonsSpawned++;
    console.log(
      `Novo esqueleto adicionado em (${x}, ${y}). Esqueletos ativos: ${this.currentSkeletons}/${this.maxSkeletons}`
    );
  }

  gerenciarIAEsqueleto(skeleton) {
    if (!skeleton.active || !this.personagemLocal.active) {
      if (skeleton.body) skeleton.setVelocity(0, 0);
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      skeleton.x,
      skeleton.y,
      this.personagemLocal.x,
      this.personagemLocal.y
    );
    const angle = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(
        skeleton.x,
        skeleton.y,
        this.personagemLocal.x,
        this.personagemLocal.y
      )
    );
    let direcaoParaPlayer = "frente";
    if (angle > -45 && angle <= 45) direcaoParaPlayer = "direita";
    else if (angle > 45 && angle <= 135) direcaoParaPlayer = "frente";
    else if (angle > 135 || angle <= -135) direcaoParaPlayer = "esquerda";
    else if (angle > -135 && angle <= -45) direcaoParaPlayer = "tras";

    const skeletonSpeed = this.speed * 0.5;
    this.physics.moveToObject(skeleton, this.personagemLocal, skeletonSpeed);
    skeleton.anims.play(`skeleton-andando-${direcaoParaPlayer}`, true);
  }

  /**
   * Função de callback para quando o personagem e um esqueleto se sobrepõem (overlap).
   * @param {Phaser.GameObjects.Sprite} player O objeto do jogador.
   * @param {Phaser.GameObjects.Sprite} skeleton O objeto do esqueleto.
   */
  handlePlayerSkeletonOverlap(player, skeleton) {
    if (
      skeleton.active &&
      player.active &&
      !skeleton.hasOwnProperty("lastAttackTime")
    ) {
      skeleton.lastAttackTime = 0;
    }

    if (
      skeleton.active &&
      player.active &&
      this.time.now > skeleton.lastAttackTime + 500
    ) {
      this.receberDano(player, 5);
      skeleton.lastAttackTime = this.time.now;
    }
  }

  update() {
    // Controle unificado para Suny e Nephis
    if (
      this.meuPersonagem &&
      this.meuPersonagem.vidaAtual > 0 &&
      this.controleScene &&
      this.controleScene.joystickData
    ) {
      const joystickData = this.controleScene.joystickData;
      const force = joystickData.force;
      const angleRad = joystickData.rad;
      let animacao = null;
      if (force > this.threshold) {
        const velocityX = Math.cos(angleRad) * this.speed;
        const velocityY = Math.sin(angleRad) * this.speed;
        this.meuPersonagem.setVelocity(velocityX, velocityY);
        const angleDeg = joystickData.angle;
        if (angleDeg > -45 && angleDeg <= 45) {
          this.direcaoAtual = "direita";
          animacao = `${this.assignedCharacter}-andando-direita`;
        } else if (angleDeg > 45 && angleDeg <= 135) {
          this.direcaoAtual = "frente";
          animacao = `${this.assignedCharacter}-andando-frente`;
        } else if (angleDeg > 135 || angleDeg <= -135) {
          this.direcaoAtual = "esquerda";
          animacao = `${this.assignedCharacter}-andando-esquerda`;
        } else if (angleDeg > -135 && angleDeg <= -45) {
          this.direcaoAtual = "tras";
          animacao = `${this.assignedCharacter}-andando-tras`;
        }
        if (animacao) this.meuPersonagem.anims.play(animacao, true);
      } else {
        this.meuPersonagem.setVelocity(0);
        this.meuPersonagem.anims.play(
          `${this.assignedCharacter}-parado-frente`,
          true
        );
      }
    } else if (this.meuPersonagem && this.meuPersonagem.vidaAtual <= 0) {
      this.meuPersonagem.setVelocity(0);
    }

    this.atualizarBarraVida(this.personagemLocal);
    this.atualizarBarraVida(this.nephisLocal);

    if (this.enemies) {
      this.enemies.getChildren().forEach((enemy) => {
        this.atualizarBarraVida(enemy);
        this.gerenciarIAEsqueleto(enemy);
      });
    }

    if (this.game.socket && this.meuPersonagem) {
      this.game.socket.emit("atualizacao-jogador", {
        id: this.game.socket.id,
        x: this.meuPersonagem.x,
        y: this.meuPersonagem.y,
        vida: this.meuPersonagem.vidaAtual,
        anim: this.meuPersonagem.anims.currentAnim?.key,
        personagem: this.assignedCharacter,
      });
    }

    Object.values(this.outrosJogadores).forEach((jogador) => {
      this.atualizarBarraVida(jogador);
    });
  }

  criarOutroJogador(info) {
    const outro = this.physics.add.sprite(info.x, info.y, info.personagem);
    outro.setCollideWorldBounds(true);
    outro.vidaMaxima = 200;
    outro.vidaAtual = info.vida || 200;
    outro.anims.play(info.anim || `${info.personagem}-parado-frente`);
    outro.healthBar = this.criarBarraDeVida();
    outro.setDepth(2.5);
    this.outrosJogadores[info.id] = outro;
  }
}
