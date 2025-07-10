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

    this.maxSkeletons = 8;
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

    // Sistema de XP e Nível - Sempre inicializar com valores padrão
    this.playerStats = {
      level: 1,
      xp: 0,
      xpParaProximoNivel: 100,
      atributos: {
        danoFisico: 1.0, // Multiplicador (1.0 = 100%)
        danoMagico: 1.0, // Multiplicador (1.0 = 100%)
        vida: 200, // Valor base
        defesa: 1.0, // Multiplicador (1.0 = 100%)
      },
    };

    // Controlo de quem deu dano aos esqueletos
    this.skeletonDamageDealt = {};

    // Otimização de performance
    this.lastUpdateTime = 0;
    this.updateInterval = 16; // ~60 FPS

    // Sistema de timer e pontuação
    this.gameTimer = 10; // 5 minutos em segundos
    this.timerText = null;
    this.score = 0;
    this.scoreText = null;
  }

  init(data) {
    // FORÇAR LIMPEZA COMPLETA DO LOCALSTORAGE
    try {
      localStorage.removeItem("nightmare_tear_stats");
      localStorage.clear();
      console.log("[RESET] localStorage limpo completamente");
    } catch (error) {
      console.log("[RESET] Erro ao limpar localStorage:", error);
    }

    // FORÇAR RESET DOS STATS
    this.playerStats = {
      level: 1,
      xp: 0,
      xpParaProximoNivel: 100,
      atributos: {
        danoFisico: 1.0,
        danoMagico: 1.0,
        vida: 200,
        defesa: 1.0,
      },
    };
    console.log(
      "[RESET] Stats forçados para valores padrão:",
      this.playerStats
    );

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
      this.assignedCharacter = "suny";
      this.currentRoomNumber = 1;
      this.sunyActive = true;
      this.nephisActive = false;
    }

    // Configurar callbacks do WebRTC Manager
    if (this.game.webRTCManager) {
      this.game.webRTCManager.setOnGameStateReceived((gameState) => {
        this.handleWebRTCGameState(gameState);
      });

      this.game.webRTCManager.setOnConnectionStateChanged((isConnected) => {
        console.log("[Fase1] WebRTC conectado:", isConnected);
      });
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
    this.personagemLocal.vidaMaxima = this.playerStats.atributos.vida;
    this.personagemLocal.vidaAtual = this.playerStats.atributos.vida;
    this.personagemLocal.healthBar = this.criarBarraDeVida();
    this.personagemLocal.setDepth(2.5);

    this.personagemLocal.setVisible(true);
    this.personagemLocal.body.enable = true;

    const nephisSpawnX = centerX + 100;
    const nephisSpawnY = centerY;
    this.nephisLocal = this.physics.add.sprite(
      nephisSpawnX,
      nephisSpawnY,
      "nephis"
    );
    this.nephisLocal.setCollideWorldBounds(true);
    this.nephisLocal.vidaMaxima = this.playerStats.atributos.vida;
    this.nephisLocal.vidaAtual = this.playerStats.atributos.vida;
    this.nephisLocal.healthBar = this.criarBarraDeVida();
    this.nephisLocal.setDepth(2.5);

    this.nephisLocal.setVisible(true);
    this.nephisLocal.body.enable = true;

    // Definir meuPersonagem com base no assignedCharacter
    if (this.assignedCharacter === "suny") {
      this.meuPersonagem = this.personagemLocal;
      this.nephisLocal.setVisible(false);
      this.nephisLocal.body.enable = false;
    } else if (this.assignedCharacter === "nephis") {
      this.meuPersonagem = this.nephisLocal;
      this.personagemLocal.setVisible(false);
      this.personagemLocal.body.enable = false;
    }

    // O outro personagem é o que não é o meuPersonagem
    this.outroPersonagemLocal =
      this.assignedCharacter === "suny"
        ? this.nephisLocal
        : this.personagemLocal;

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

    this.input.keyboard.on("keydown-L", () => {
      // TESTE: Forçar level up para testar os botões
      if (this.meuPersonagem) {
        console.log("[TESTE] Forçando level up para teste");
        this.ganharXP(this.playerStats.xpParaProximoNivel);
      }
    });

    this.input.keyboard.on("keydown-C", (event) => {
      if (
        this.sunyActive &&
        (event.key === "ç" ||
          event.key === "Ç" ||
          event.key === "c" ||
          event.key === "C")
      ) {
        this.atacarSkeletonsProximos(this.personagemLocal, 80);
      }
    });

    this.input.keyboard.on("keydown-V", (event) => {
      if (this.nephisActive && (event.key === "v" || event.key === "V")) {
        this.atacarSkeletonsProximos(this.nephisLocal, 80);
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
      this.nephisKeys.damage.on("down", () => {
        this.atacarSkeletonsProximos(this.nephisLocal, 80);
      });
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

    // Criar timer no meio da tela (parte superior)
    this.timerText = this.add
      .text(this.cameras.main.centerX, 40, this.formatarTempo(this.gameTimer), {
        fontSize: "24px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    // Criar pontuação no canto superior esquerdo
    this.scoreText = this.add
      .text(20, 20, `Score: ${this.score}`, {
        fontSize: "18px",
        fontFamily: "monospace",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(1002);

    // Iniciar o timer
    this.time.addEvent({
      delay: 1000,
      callback: this.atualizarTimer,
      callbackScope: this,
      loop: true,
    });

    if (this.game.socket) {
      this.game.socket.off("estadoDaSala");
      this.game.socket.off("novoJogadorNaSala");
      this.game.socket.off("outro-jogador-atualizado");
      this.game.socket.off("jogador-desconectado");
      this.game.socket.off("jogador-morreu");
      this.game.socket.off("skeleton-sync");

      this.game.socket.on("estadoDaSala", (jogadoresNaSala) => {
        Object.values(jogadoresNaSala).forEach((jogadorInfo) => {
          if (jogadorInfo.id === this.game.socket.id) {
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
        if (outro && outro.active && outro.anims) {
          outro.setPosition(jogadorInfo.x, jogadorInfo.y);
          outro.anims.play(jogadorInfo.anim, true);
          outro.vidaAtual = jogadorInfo.vida;
          this.atualizarBarraVida(outro);
        }
      });

      this.game.socket.on("skeleton-sync", (skeletonData) => {
        this.handleWebRTCGameState(skeletonData);
      });

      this.game.socket.on("jogador-desconectado", (jogadorId) => {
        if (this.outrosJogadores[jogadorId]) {
          if (this.outrosJogadores[jogadorId].destroy) {
            this.outrosJogadores[jogadorId].destroy();
          }
          delete this.outrosJogadores[jogadorId];
        }
      });

      this.game.socket.on("jogador-morreu", (data) => {
        console.log(
          `[MORTE] Recebido evento de morte. Jogador morto: ${data.jogadorMortoId}, Personagem: ${data.personagem}`
        );

        this.physics.world.pause();
        if (
          this.controleScene &&
          typeof this.controleScene.hideJoystick === "function"
        ) {
          this.controleScene.hideJoystick();
        }

        const euMorri = data.jogadorMortoId === this.game.socket.id;

        console.log(`[MORTE] Eu morri: ${euMorri}`);

        const playerData = {
          isSuny: data.personagem === "suny",
          frame: 209,
          tint: 0xff0000,
          euMorri: euMorri,
          timestamp: data.timestamp,
        };

        this.time.delayedCall(
          500,
          () => {
            this.scene.stop("fase1");
            this.scene.start("morte", { playerData: playerData });
          },
          [],
          this
        );
      });

      this.game.socket.on("resetar-sala", (data) => {
        console.log(
          `[Fase1] Recebido comando para resetar sala. Motivo: ${
            data?.motivo || "desconhecido"
          }`
        );

        this.game.socket.off("estadoDaSala");
        this.game.socket.off("novoJogadorNaSala");
        this.game.socket.off("outro-jogador-atualizado");
        this.game.socket.off("jogador-desconectado");
        this.game.socket.off("jogador-morreu");
        this.game.socket.off("skeleton-sync");
        this.game.socket.off("resetar-sala");

        this.scene.stop("fase1");
        this.scene.start("abertura");
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

  atacarSkeletonsProximos(atacante, alcance) {
    if (!this.enemies || !atacante) return;

    let skeletonMaisProximo = null;
    let menorDistancia = Infinity;

    this.enemies.getChildren().forEach((skeleton) => {
      if (!skeleton.active) return;

      const distancia = Phaser.Math.Distance.Between(
        atacante.x,
        atacante.y,
        skeleton.x,
        skeleton.y
      );

      if (distancia <= alcance && distancia < menorDistancia) {
        menorDistancia = distancia;
        skeletonMaisProximo = skeleton;
      }
    });

    if (skeletonMaisProximo) {
      let dano = 10;
      if (atacante === this.personagemLocal) {
        dano *= this.playerStats.atributos.danoFisico;
      } else if (atacante === this.nephisLocal) {
        dano *= this.playerStats.atributos.danoMagico;
      }

      this.receberDano(skeletonMaisProximo, dano, atacante);
      console.log(
        `Atacou o skeleton mais próximo (distância: ${Math.round(
          menorDistancia
        )})`
      );
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
      !personagem ||
      !personagem.active ||
      !personagem.healthBar ||
      !personagem.healthBar.bg
    )
      return;

    personagem.healthBar.bg.setVisible(
      personagem.vidaAtual < personagem.vidaMaxima
    );
    personagem.healthBar.fg.setVisible(
      personagem.vidaAtual < personagem.vidaMaxima
    );

    if (!personagem.healthBar.bg.visible) return;

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

    if (personagem.depth !== undefined && personagem.depth !== null) {
      personagem.healthBar.bg.setDepth(personagem.depth + 1);
      personagem.healthBar.fg.setDepth(personagem.depth + 2);
    } else {
      personagem.healthBar.bg.setDepth(3);
      personagem.healthBar.fg.setDepth(4);
    }
  }

  receberDano(personagem, quantidade, atacante = null) {
    if (
      !personagem.active ||
      typeof personagem.vidaAtual === "undefined" ||
      personagem.vidaAtual <= 0
    )
      return;

    let danoFinal = quantidade;
    if (
      personagem === this.meuPersonagem &&
      this.playerStats.atributos.defesa
    ) {
      danoFinal = quantidade / this.playerStats.atributos.defesa;
    }

    personagem.vidaAtual -= danoFinal;
    if (personagem.vidaAtual < 0) personagem.vidaAtual = 0;

    if (
      personagem.texture &&
      personagem.texture.key === "mob_skeleton" &&
      atacante === this.meuPersonagem
    ) {
      const skeletonId =
        personagem.id || `skeleton_${personagem.x}_${personagem.y}`;
      if (!this.skeletonDamageDealt[skeletonId]) {
        this.skeletonDamageDealt[skeletonId] = 0;
      }
      this.skeletonDamageDealt[skeletonId] += danoFinal;
    }

    console.log(
      `Vida de ${personagem.texture.key}: ${personagem.vidaAtual}/${personagem.vidaMaxima}`
    );
    if (personagem.healthBar) {
      this.atualizarBarraVida(personagem);
    }
    if (personagem.vidaAtual <= 0) {
      console.log(`${personagem.texture.key} morreu!`);
      personagem.setTint(0xff0000);

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
          deathAnimationKey = "suny-morte";
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

        this.time.delayedCall(
          0,
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
          const skeletonId =
            personagem.id || `skeleton_${personagem.x}_${personagem.y}`;
          if (this.skeletonDamageDealt[skeletonId] > 0) {
            this.ganharXP(25);
            this.adicionarPontos(10); // Adicionar 10 pontos por skeleton morto
          }

          delete this.skeletonDamageDealt[skeletonId];

          this.currentSkeletons--;
          if (this.currentSkeletons < this.maxSkeletons) {
            this.time.delayedCall(
              5000,
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
          if (personagem && personagem.healthBar) {
            if (personagem.healthBar.bg && personagem.healthBar.bg.destroy) {
              personagem.healthBar.bg.destroy();
            }
            if (personagem.healthBar.fg && personagem.healthBar.fg.destroy) {
              personagem.healthBar.fg.destroy();
            }
          }
          if (personagem && personagem.destroy) {
            personagem.destroy();
          }
        });
      }
    }
  }

  handleWebRTCGameState(gameState) {
    if (!gameState || !gameState.type) {
      return;
    }

    switch (gameState.type) {
      case "player":
        if (gameState.id !== this.game.socket.id) {
          const outro = this.outrosJogadores[gameState.id];
          if (outro) {
            outro.setPosition(gameState.x, gameState.y);
            if (
              gameState.anim &&
              outro.anims.currentAnim?.key !== gameState.anim
            ) {
              outro.anims.play(gameState.anim, true);
            }
            outro.vidaAtual = gameState.vida;
            this.atualizarBarraVida(outro);
          } else {
            this.criarOutroJogador(gameState);
          }
        }
        break;
      case "skeleton":
        const enemy = this.enemies
          .getChildren()
          .find((e) => e.id === gameState.id);
        if (enemy) {
          if (!enemy.isControlledByMe) {
            enemy.setPosition(gameState.x, gameState.y);
            if (
              gameState.velocityX !== undefined &&
              gameState.velocityY !== undefined
            ) {
              enemy.setVelocity(gameState.velocityX, gameState.velocityY);
            }
            if (
              gameState.anim &&
              enemy.anims.currentAnim?.key !== gameState.anim
            ) {
              enemy.anims.play(gameState.anim, true);
            }
            enemy.vidaAtual = gameState.vida;
            this.atualizarBarraVida(enemy);
          }
        } else {
          this.criarEsqueletoRemoto(gameState);
        }
        break;
      case "player_stats":
        if (gameState.id !== this.game.socket.id) {
          console.log(
            `Stats recebidos do jogador ${gameState.id}:`,
            gameState.stats
          );
        }
        break;
    }
  }

  criarEsqueletoRemoto(gameState) {
    const skeleton = this.enemies.create(
      gameState.x,
      gameState.y,
      "mob_skeleton"
    );

    if (!skeleton) {
      console.error("[ERRO] Não foi possível criar esqueleto remoto");
      return;
    }

    skeleton.setCollideWorldBounds(true);
    skeleton.setDepth(this.personagemLocal.depth);
    skeleton.vidaMaxima = 100;
    skeleton.vidaAtual = gameState.vida || 100;
    skeleton.healthBar = this.criarBarraDeVida();
    skeleton.id = gameState.id;
    skeleton.isControlledByMe = false;

    skeleton.body.setSize(48, 48);
    skeleton.body.setOffset(8, 8);
    skeleton.body.setMass(0.8);
    skeleton.body.setBounce(0.3);

    this.physics.add.collider(
      skeleton,
      this.personagemLocal,
      (skeleton, player) => {
        this.empurrarSkeleton(skeleton, player);
      }
    );

    this.physics.add.collider(
      skeleton,
      this.nephisLocal,
      (skeleton, player) => {
        this.empurrarSkeleton(skeleton, player);
      }
    );

    this.physics.add.collider(skeleton, this.enemies);

    if (
      gameState.velocityX !== undefined &&
      gameState.velocityY !== undefined
    ) {
      skeleton.setVelocity(gameState.velocityX, gameState.velocityY);
    }
    if (gameState.anim) {
      skeleton.anims.play(gameState.anim, true);
    }

    this.atualizarBarraVida(skeleton);
    console.log(`Esqueleto remoto criado: ${gameState.id}`);
  }

  criarJogadorLocal(jogadorInfo) {
    if (this.meuPersonagem) {
      this.meuPersonagem.setPosition(jogadorInfo.x, jogadorInfo.y);
      this.meuPersonagem.vidaAtual = jogadorInfo.vida;
      this.atualizarBarraVida(this.meuPersonagem);
      console.log(
        `Jogador local (${jogadorInfo.id}) sincronizado na posição (${jogadorInfo.x}, ${jogadorInfo.y}).`
      );
    }
  }

  criarOutroJogador(jogadorInfo) {
    if (this.outrosJogadores[jogadorInfo.id]) {
      const outro = this.outrosJogadores[jogadorInfo.id];
      outro.setPosition(jogadorInfo.x, jogadorInfo.y);
      outro.vidaAtual = jogadorInfo.vida;
      this.atualizarBarraVida(outro);
      return;
    }

    console.log(
      `Criando outro jogador: ${jogadorInfo.id} como ${jogadorInfo.personagem}`
    );

    let outroJogador;
    if (jogadorInfo.personagem === "suny") {
      outroJogador = this.physics.add.sprite(
        jogadorInfo.x,
        jogadorInfo.y,
        "suny"
      );
    } else {
      outroJogador = this.physics.add.sprite(
        jogadorInfo.x,
        jogadorInfo.y,
        "nephis"
      );
    }

    outroJogador.setCollideWorldBounds(true);
    outroJogador.setDepth(2.5);
    outroJogador.vidaMaxima = this.playerStats.atributos.vida;
    outroJogador.vidaAtual =
      jogadorInfo.vida || this.playerStats.atributos.vida;
    outroJogador.healthBar = this.criarBarraDeVida();
    outroJogador.setVisible(true);
    outroJogador.body.enable = true;

    const camadaArvore = this.tilemapMapa.getLayer("arvore").tilemapLayer;
    const camadaMontanha = this.tilemapMapa.getLayer("montanha").tilemapLayer;
    const camadaMontanha2 = this.tilemapMapa.getLayer("montanha2").tilemapLayer;

    this.physics.add.collider(outroJogador, [
      camadaArvore,
      camadaMontanha,
      camadaMontanha2,
    ]);

    this.outrosJogadores[jogadorInfo.id] = outroJogador;

    this.atualizarBarraVida(outroJogador);
  }

  criarAnimacoesPersonagem() {
    this.anims.create({
      key: "suny-andando-direita",
      frames: this.anims.generateFrameNumbers("suny", { start: 94, end: 103 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "suny-andando-esquerda",
      frames: this.anims.generateFrameNumbers("suny", { start: 72, end: 81 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "suny-andando-tras",
      frames: this.anims.generateFrameNumbers("suny", { start: 61, end: 70 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "suny-andando-frente",
      frames: this.anims.generateFrameNumbers("suny", { start: 83, end: 92 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "suny-parado-frente",
      frames: [{ key: "suny", frame: 82 }],
      frameRate: 1,
      repeat: 0,
    });
    this.anims.create({
      key: "suny-morte",
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
      repeat: 1,
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
    skeleton.id = `skeleton_${this.totalSkeletonsSpawned}_${this.game.socket.id}`;
    skeleton.isControlledByMe = true;

    skeleton.body.setSize(48, 48);
    skeleton.body.setOffset(8, 8);
    skeleton.body.setMass(0.8);
    skeleton.body.setBounce(0.3);

    this.physics.add.collider(
      skeleton,
      this.personagemLocal,
      (skeleton, player) => {
        this.empurrarSkeleton(skeleton, player);
      }
    );

    this.physics.add.collider(
      skeleton,
      this.nephisLocal,
      (skeleton, player) => {
        this.empurrarSkeleton(skeleton, player);
      }
    );

    this.physics.add.collider(skeleton, this.enemies);

    this.currentSkeletons++;
    this.totalSkeletonsSpawned++;
    console.log(
      `Novo esqueleto adicionado em (${x}, ${y}). Esqueletos ativos: ${this.currentSkeletons}/${this.maxSkeletons}`
    );
  }

  empurrarSkeleton(skeleton, player) {
    if (!skeleton.active || !player.active) return;

    const dx = skeleton.x - player.x;
    const dy = skeleton.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const forceMultiplier = 150;
      const pushX = (dx / distance) * forceMultiplier;
      const pushY = (dy / distance) * forceMultiplier;

      skeleton.setVelocity(pushX, pushY);

      this.time.delayedCall(200, () => {
        if (skeleton.active) {
          skeleton.setVelocity(
            skeleton.body.velocity.x * 0.5,
            skeleton.body.velocity.y * 0.5
          );
        }
      });
    }
  }

  gerenciarIAEsqueleto(skeleton) {
    if (!skeleton.active) {
      if (skeleton.body) skeleton.setVelocity(0, 0);
      return;
    }

    if (!skeleton.isControlledByMe) {
      return;
    }

    let jogadorMaisProximo = null;
    let menorDistancia = Infinity;

    if (
      this.personagemLocal &&
      this.personagemLocal.active &&
      this.personagemLocal.vidaAtual > 0
    ) {
      const distancia = Phaser.Math.Distance.Between(
        skeleton.x,
        skeleton.y,
        this.personagemLocal.x,
        this.personagemLocal.y
      );
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        jogadorMaisProximo = this.personagemLocal;
      }
    }

    if (
      this.nephisLocal &&
      this.nephisLocal.active &&
      this.nephisLocal.vidaAtual > 0
    ) {
      const distancia = Phaser.Math.Distance.Between(
        skeleton.x,
        skeleton.y,
        this.nephisLocal.x,
        this.nephisLocal.y
      );
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        jogadorMaisProximo = this.nephisLocal;
      }
    }

    Object.values(this.outrosJogadores).forEach((outroJogador) => {
      if (outroJogador && outroJogador.active && outroJogador.vidaAtual > 0) {
        const distancia = Phaser.Math.Distance.Between(
          skeleton.x,
          skeleton.y,
          outroJogador.x,
          outroJogador.y
        );
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          jogadorMaisProximo = outroJogador;
        }
      }
    });

    if (!jogadorMaisProximo) {
      if (skeleton.body) skeleton.setVelocity(0, 0);
      return;
    }

    const minDistance = 25;
    const attackRange = this.SKELETON_ATTACK_RANGE;

    if (menorDistancia < minDistance) {
      const angle = Phaser.Math.Angle.Between(
        jogadorMaisProximo.x,
        jogadorMaisProximo.y,
        skeleton.x,
        skeleton.y
      );

      const pushForce = 20;
      skeleton.setVelocity(
        Math.cos(angle) * pushForce,
        Math.sin(angle) * pushForce
      );

      return;
    }

    if (menorDistancia <= attackRange) {
      skeleton.setVelocity(0, 0);

      if (!skeleton.lastAttackTime) skeleton.lastAttackTime = 0;
      if (this.time.now > skeleton.lastAttackTime + 1000) {
        this.receberDano(jogadorMaisProximo, 5, skeleton);
        skeleton.lastAttackTime = this.time.now;
      }

      return;
    }

    const angle = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(
        skeleton.x,
        skeleton.y,
        jogadorMaisProximo.x,
        jogadorMaisProximo.y
      )
    );

    let direcaoParaPlayer = "frente";
    if (angle > -45 && angle <= 45) direcaoParaPlayer = "direita";
    else if (angle > 45 && angle <= 135) direcaoParaPlayer = "frente";
    else if (angle > 135 || angle <= -135) direcaoParaPlayer = "esquerda";
    else if (angle > -135 && angle <= -45) direcaoParaPlayer = "tras";

    const skeletonSpeed = this.speed * 0.4;
    this.physics.moveToObject(skeleton, jogadorMaisProximo, skeletonSpeed);
    skeleton.anims.play(`skeleton-andando-${direcaoParaPlayer}`, true);

    if (this.time.now % 33 < this.updateInterval) {
      const skeletonGameStateData = {
        type: "skeleton",
        id: skeleton.id,
        x: skeleton.x,
        y: skeleton.y,
        vida: skeleton.vidaAtual,
        anim: skeleton.anims.currentAnim?.key,
        velocityX: skeleton.body.velocity.x,
        velocityY: skeleton.body.velocity.y,
      };

      if (
        this.game.webRTCManager &&
        this.game.webRTCManager.isWebRTCConnected()
      ) {
        this.game.webRTCManager.sendGameState(skeletonGameStateData);
      } else {
        this.game.socket.emit("skeleton-update", skeletonGameStateData);
      }
    }
  }

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
    const now = this.time.now;

    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }
    this.lastUpdateTime = now;

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

    if (now % 100 < this.updateInterval) {
      this.atualizarBarraVida(this.personagemLocal);
      this.atualizarBarraVida(this.nephisLocal);
    }

    if (
      this.game.socket &&
      this.meuPersonagem &&
      now % 16 < this.updateInterval
    ) {
      const playerGameStateData = {
        type: "player",
        id: this.game.socket.id,
        x: this.meuPersonagem.x,
        y: this.meuPersonagem.y,
        vida: this.meuPersonagem.vidaAtual,
        anim: this.meuPersonagem.anims.currentAnim?.key,
        personagem: this.assignedCharacter,
      };

      if (
        this.game.webRTCManager &&
        this.game.webRTCManager.isWebRTCConnected()
      ) {
        this.game.webRTCManager.sendGameState(playerGameStateData);
      } else {
        this.game.socket.emit("atualizacao-jogador", playerGameStateData);
      }
    }

    if (this.enemies) {
      this.enemies.getChildren().forEach((enemy, index) => {
        if ((now + index * 10) % 100 < this.updateInterval) {
          this.atualizarBarraVida(enemy);
        }

        this.gerenciarIAEsqueleto(enemy);
      });
    }

    if (now % 150 < this.updateInterval) {
      Object.values(this.outrosJogadores).forEach((jogador) => {
        this.atualizarBarraVida(jogador);
      });
    }
  }

  ganharXP(quantidade) {
    this.playerStats.xp += quantidade;
    console.log(
      `[XP] Ganhou ${quantidade} XP. Total: ${this.playerStats.xp}/${this.playerStats.xpParaProximoNivel}`
    );

    if (this.playerStats.xp >= this.playerStats.xpParaProximoNivel) {
      this.subirDeNivel();
    }

    this.atualizarUIXP();
  }

  subirDeNivel() {
    this.playerStats.level++;
    this.playerStats.xp -= this.playerStats.xpParaProximoNivel;
    this.playerStats.xpParaProximoNivel = Math.floor(
      this.playerStats.xpParaProximoNivel * 1.5
    );

    console.log(`[LEVEL UP] Subiu para o nível ${this.playerStats.level}!`);

    this.physics.world.pause();
    this.mostrarInterfaceLevelUp();
  }

  /**
   * CORREÇÃO: Interface simplificada de level up com botões funcionais
   */
  mostrarInterfaceLevelUp() {
    console.log("[LEVEL UP] Criando interface simplificada");

    this.physics.world.pause();

    if (this.controleScene && this.controleScene.hideJoystick) {
      this.controleScene.hideJoystick();
    }

    const overlay = this.add
      .rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.85
      )
      .setScrollFactor(0)
      .setDepth(1000);

    const titulo = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 150,
        "LEVEL UP!",
        {
          fontSize: "32px",
          fontFamily: "Arial Black, sans-serif",
          color: "#EECA57",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 2,
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    const subtitulo = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 110,
        `${this.assignedCharacter.toUpperCase()} - Level ${
          this.playerStats.level
        }`,
        {
          fontSize: "16px",
          fontFamily: "Arial, sans-serif",
          color: "#FFFFFF",
          fontStyle: "bold",
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    const atributos = [
      {
        key: "danoFisico",
        nome: "Dano Físico +10%",
        bonus: 0.1,
        tipo: "percentual",
        cor: 0xff4757,
      },
      {
        key: "danoMagico",
        nome: "Dano Mágico +10%",
        bonus: 0.1,
        tipo: "percentual",
        cor: 0x5352ed,
      },
      {
        key: "vida",
        nome: "Vida +20",
        bonus: 20,
        tipo: "valor",
        cor: 0x2ed573,
      },
      {
        key: "defesa",
        nome: "Defesa +10%",
        bonus: 0.1,
        tipo: "percentual",
        cor: 0xffa502,
      },
    ];

    const botoes = [];

    atributos.forEach((atributo, index) => {
      const y = this.cameras.main.centerY - 50 + index * 40;

      const botao = this.add
        .rectangle(this.cameras.main.centerX, y, 300, 35, atributo.cor, 0.8)
        .setStrokeStyle(2, 0xffffff, 1)
        .setScrollFactor(0)
        .setDepth(1001)
        .setInteractive({ useHandCursor: true });

      const textoBotao = this.add
        .text(this.cameras.main.centerX, y, atributo.nome, {
          fontSize: "14px",
          fontFamily: "Arial, sans-serif",
          color: "#FFFFFF",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1002);

      botoes.push({ botao, textoBotao });

      botao.on("pointerdown", () => {
        console.log(`[CLIQUE SIMPLES] Selecionado: ${atributo.nome}`);

        this.aplicarBonusAtributo(atributo);

        overlay.destroy();
        titulo.destroy();
        subtitulo.destroy();

        botoes.forEach(({ botao: b, textoBotao: t }) => {
          b.destroy();
          t.destroy();
        });

        if (this.controleScene && this.controleScene.showJoystick) {
          this.controleScene.showJoystick();
        }

        this.physics.world.resume();

        console.log("[LEVEL UP] Interface fechada e jogo resumido");
      });

      botao.on("pointerover", () => {
        botao.setFillStyle(atributo.cor, 1);
        textoBotao.setColor("#FFFF00");
      });

      botao.on("pointerout", () => {
        botao.setFillStyle(atributo.cor, 0.8);
        textoBotao.setColor("#FFFFFF");
      });
    });

    console.log("[LEVEL UP] Interface simplificada criada");
  }

  aplicarBonusAtributo(atributo) {
    if (atributo.tipo === "percentual") {
      this.playerStats.atributos[atributo.key] *= 1 + atributo.bonus;
    } else {
      this.playerStats.atributos[atributo.key] += atributo.bonus;

      if (atributo.key === "vida") {
        this.meuPersonagem.vidaMaxima = this.playerStats.atributos.vida;
        this.meuPersonagem.vidaAtual = Math.min(
          this.meuPersonagem.vidaAtual + atributo.bonus,
          this.meuPersonagem.vidaMaxima
        );
      }
    }

    console.log(
      `[LEVEL UP] ${atributo.nome} melhorado! Novo valor:`,
      this.playerStats.atributos[atributo.key]
    );

    this.sincronizarStats();
  }

  atualizarUIXP() {
    // TODO: Implementar barra de XP na interface
  }

  sincronizarStats() {
    const statsData = {
      type: "player_stats",
      id: this.game.socket.id,
      stats: this.playerStats,
    };

    if (
      this.game.webRTCManager &&
      this.game.webRTCManager.isWebRTCConnected()
    ) {
      this.game.webRTCManager.sendGameState(statsData);
    }
  }

  executarComportamentoIA(skeleton, jogadorMaisProximo, menorDistancia) {
    switch (skeleton.aiState) {
      case "fugindo":
        this.executarComportamentoFuga(skeleton, jogadorMaisProximo);
        break;
      case "atacando":
        this.executarComportamentoAtaque(skeleton, jogadorMaisProximo);
        break;
      case "perseguindo":
        this.executarComportamentoPerseguicao(skeleton, jogadorMaisProximo);
        break;
      case "patrulhando":
        this.executarComportamentoPatrulha(skeleton);
        break;
    }
  }

  executarComportamentoFuga(skeleton, jogadorMaisProximo) {
    if (!jogadorMaisProximo) {
      skeleton.setVelocity(0, 0);
      return;
    }

    const angle = Phaser.Math.Angle.Between(
      jogadorMaisProximo.x,
      jogadorMaisProximo.y,
      skeleton.x,
      skeleton.y
    );

    const fugaSpeed = this.speed * 0.6;
    skeleton.setVelocity(
      Math.cos(angle) * fugaSpeed,
      Math.sin(angle) * fugaSpeed
    );

    const angleDeg = Phaser.Math.RadToDeg(angle);
    let direcao = "frente";
    if (angleDeg > -45 && angleDeg <= 45) direcao = "direita";
    else if (angleDeg > 45 && angleDeg <= 135) direcao = "frente";
    else if (angleDeg > 135 || angleDeg <= -135) direcao = "esquerda";
    else if (angleDeg > -135 && angleDeg <= -45) direcao = "tras";

    skeleton.anims.play(`skeleton-andando-${direcao}`, true);
  }

  executarComportamentoAtaque(skeleton, jogadorMaisProximo) {
    if (!jogadorMaisProximo) {
      skeleton.setVelocity(0, 0);
      return;
    }

    skeleton.setVelocity(0, 0);

    if (this.time.now > skeleton.lastAttackTime + skeleton.attackCooldown) {
      this.receberDano(jogadorMaisProximo, 8, skeleton);
      skeleton.lastAttackTime = this.time.now;

      skeleton.setTint(0xff0000);
      this.time.delayedCall(100, () => {
        if (skeleton.active) skeleton.clearTint();
      });
    }
  }

  executarComportamentoPerseguicao(skeleton, jogadorMaisProximo) {
    if (!jogadorMaisProximo) {
      skeleton.setVelocity(0, 0);
      return;
    }

    const distancia = Phaser.Math.Distance.Between(
      skeleton.x,
      skeleton.y,
      jogadorMaisProximo.x,
      jogadorMaisProximo.y
    );

    const minDistance = 25;

    if (distancia < minDistance) {
      const angle = Phaser.Math.Angle.Between(
        jogadorMaisProximo.x,
        jogadorMaisProximo.y,
        skeleton.x,
        skeleton.y
      );

      const pushForce = 30;
      skeleton.setVelocity(
        Math.cos(angle) * pushForce,
        Math.sin(angle) * pushForce
      );
      return;
    }

    const angle = Phaser.Math.Angle.Between(
      skeleton.x,
      skeleton.y,
      jogadorMaisProximo.x,
      jogadorMaisProximo.y
    );

    const perseguicaoSpeed = this.speed * 0.45;
    skeleton.setVelocity(
      Math.cos(angle) * perseguicaoSpeed,
      Math.sin(angle) * perseguicaoSpeed
    );

    const angleDeg = Phaser.Math.RadToDeg(angle);
    let direcao = "frente";
    if (angleDeg > -45 && angleDeg <= 45) direcao = "direita";
    else if (angleDeg > 45 && angleDeg <= 135) direcao = "frente";
    else if (angleDeg > 135 || angleDeg <= -135) direcao = "esquerda";
    else if (angleDeg > -135 && angleDeg <= -45) direcao = "tras";

    skeleton.anims.play(`skeleton-andando-${direcao}`, true);
  }

  executarComportamentoPatrulha(skeleton) {
    const distanciaAoAlvo = Phaser.Math.Distance.Between(
      skeleton.x,
      skeleton.y,
      skeleton.patrolTarget.x,
      skeleton.patrolTarget.y
    );

    if (distanciaAoAlvo < 30) {
      skeleton.patrolTarget = {
        x: skeleton.x + Phaser.Math.Between(-150, 150),
        y: skeleton.y + Phaser.Math.Between(-150, 150),
      };
      skeleton.patrolTarget.x = Phaser.Math.Clamp(
        skeleton.patrolTarget.x,
        50,
        this.tilemapMapa.widthInPixels - 50
      );
      skeleton.patrolTarget.y = Phaser.Math.Clamp(
        skeleton.patrolTarget.y,
        50,
        this.tilemapMapa.heightInPixels - 50
      );
    }

    const angle = Phaser.Math.Angle.Between(
      skeleton.x,
      skeleton.y,
      skeleton.patrolTarget.x,
      skeleton.patrolTarget.y
    );

    const patrulhaSpeed = this.speed * 0.2;
    skeleton.setVelocity(
      Math.cos(angle) * patrulhaSpeed,
      Math.sin(angle) * patrulhaSpeed
    );

    const angleDeg = Phaser.Math.RadToDeg(angle);
    let direcao = "frente";
    if (angleDeg > -45 && angleDeg <= 45) direcao = "direita";
    else if (angleDeg > 45 && angleDeg <= 135) direcao = "frente";
    else if (angleDeg > 135 || angleDeg <= -135) direcao = "esquerda";
    else if (angleDeg > -135 && angleDeg <= -45) direcao = "tras";

    skeleton.anims.play(`skeleton-andando-${direcao}`, true);
  }

  shutdown() {
    if (this.controleScene) {
      this.controleScene.scene.stop();
    }
  }

  formatarTempo(segundos) {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, "0")}:${segs
      .toString()
      .padStart(2, "0")}`;
  }

  atualizarTimer() {
    this.gameTimer--;
    if (this.timerText) {
      this.timerText.setText(this.formatarTempo(this.gameTimer));
    }

    // Verificar se o tempo acabou (vitória)
    if (this.gameTimer <= 0) {
      this.vencerJogo();
    }
  }

  adicionarPontos(pontos) {
    this.score += pontos;
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score}`);
    }
  }

  vencerJogo() {
    console.log("[VITÓRIA] Jogador sobreviveu aos 5 minutos!");

    // Pausar o jogo
    this.physics.world.pause();
    if (
      this.controleScene &&
      typeof this.controleScene.hideJoystick === "function"
    ) {
      this.controleScene.hideJoystick();
    }

    // Ir para a tela final
    this.time.delayedCall(
      1000,
      () => {
        this.scene.stop("fase1");
        this.scene.start("final", {
          vitoria: true,
          personagem: this.assignedCharacter,
          score: this.score,
        });
      },
      [],
      this
    );
  }
}
