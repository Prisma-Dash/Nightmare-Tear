export default class controle extends Phaser.Scene {
  constructor() {
    super("controle");
    this.joystick = null;

    this.joystickData = {
      force: 0,
      angle: 0,
      rad: 0,
    };
  }

  preload() {
    this.load.plugin(
      "rexvirtualjoystickplugin",
      "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js",
      true
    );
  }

  create() {
    const joystickPlugin = this.plugins.get("rexvirtualjoystickplugin");
    if (!joystickPlugin) {
      console.error(
        "⚠️ RexVirtualJoystickPlugin não foi carregado na cena controle!"
      );
      return;
    }

    if (!this.add) {
      console.error(
        "🆘 this.add não está disponível na cena controle ao tentar criar o joystick!"
      );
      return;
    }

    const baseCircle = this.add.circle(0, 0, 50, 0x888888, 0.5);
    const thumbCircle = this.add.circle(0, 0, 25, 0xcccccc, 0.7);

    baseCircle.setScrollFactor(0).setDepth(1000);
    thumbCircle.setScrollFactor(0).setDepth(1001);

    this.joystick = joystickPlugin
      .add(this, {
        x: 120,
        y: this.cameras.main.height - 90,
        radius: 50,
        base: baseCircle,
        thumb: thumbCircle,
      })
      .on("update", this.dumpJoyStickState, this);

    this.dumpJoyStickState();
  }

  dumpJoyStickState() {
    if (this.joystick) {
      this.joystickData.force = this.joystick.force;
      this.joystickData.angle = this.joystick.angle;
      this.joystickData.rad = Phaser.Math.DegToRad(this.joystick.angle);
    } else {
      this.joystickData.force = 0;
      this.joystickData.angle = 0;
      this.joystickData.rad = 0;
    }
  }

  hideJoystick() {
    if (this.joystick) {
      this.joystick.setVisible(false);
      this.joystick.setEnable(false);
      this.joystickData.force = 0;
      this.joystickData.angle = 0;
      this.joystickData.rad = 0;
      this.joystickActive = false;
      console.log("Joystick hidden and deactivated.");
    }
  }

  showJoystick() {
    if (this.joystick) {
      this.joystick.setVisible(true);
      this.joystick.setEnable(true);
      this.joystickActive = true;
      console.log("Joystick shown and activated.");
    }
  }

  update() {
    if (this.joystickActive) {
      this.dumpJoyStickState();
    }
  }
}