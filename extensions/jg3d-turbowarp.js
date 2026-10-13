(function (Scratch) {
  'use strict';

  if (!Scratch || !Scratch.extensions || !Scratch.extensions.unsandboxed) {
    throw new Error('jg3d TurboWarp port must be loaded without the sandbox.');
  }

  const THREE_MODULE_URL = 'https://esm.sh/three@0.170.0';
  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const NumberType = Scratch.ArgumentType.NUMBER;
  const StringType = Scratch.ArgumentType.STRING;
  const ColorType = Scratch.ArgumentType.COLOR;
  const Command = Scratch.BlockType.COMMAND;
  const Reporter = Scratch.BlockType.REPORTER;
  const BooleanType = Scratch.BlockType.BOOLEAN;

  const roundDegrees = value => {
    const rounded = Math.round(value * 1000) / 1000;
    return Object.is(rounded, -0) ? 0 : rounded;
  };

  const toNumber = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const toColor = value => {
    const color = String(value || '#ffffff').trim();
    if (/^#[0-9a-f]{3}$/i.test(color) || /^#[0-9a-f]{6}$/i.test(color) || /^#[0-9a-f]{8}$/i.test(color)) return color;
    if (/^[0-9a-f]{6}$/i.test(color)) return `#${color}`;
    return color || '#ffffff';
  };

  class Jg3DEngine {
    constructor(THREE) {
      this.THREE = THREE;
      this.scene = null;
      this.camera = null;
      this.cameraRig = null;
      this.renderer = null;
      this.canvas = null;
      this.canvasParent = null;
      this.objects = new Map();
      this.sceneLayer = 'front';
      this.backgroundColor = '#000000';
      this.backgroundOpacity = 0;
      this.xrSession = null;
      this.xrSupported = false;
      this.xrSupportKnown = false;
      this.controllers = [];
      this.followedObjectName = '';
      this.vrButton = null;
      this.lastError = '';
      this._resizeHandler = () => this.resize();
      this.checkXRSupport();
    }

    async checkXRSupport() {
      try {
        this.xrSupported = Boolean(navigator.xr && await navigator.xr.isSessionSupported('immersive-vr'));
      } catch (error) {
        this.xrSupported = false;
      }
      this.xrSupportKnown = true;
    }

    getStageCanvas() {
      return runtime.renderer && runtime.renderer.canvas ? runtime.renderer.canvas : null;
    }

    async initialize() {
      if (this.renderer && this.scene && this.camera) return;
      const THREE = this.THREE;
      const stageCanvas = this.getStageCanvas();
      if (!stageCanvas || !stageCanvas.parentElement) {
        throw new Error('TurboWarp stage canvas was not found. Run the extension in the TurboWarp editor or packaged project.');
      }

      this.dispose(false);
      this.canvasParent = stageCanvas.parentElement;
      const parentStyle = getComputedStyle(this.canvasParent);
      if (parentStyle.position === 'static') this.canvasParent.style.position = 'relative';

      this.scene = new THREE.Scene();
      this.scene.background = null;
      this.cameraRig = new THREE.Group();
      this.scene.add(this.cameraRig);
      this.camera = new THREE.PerspectiveCamera(60, 480 / 360, 0.1, 1000);
      this.camera.position.set(0, 0, 12);
      this.camera.lookAt(0, 0, 0);
      this.cameraRig.add(this.camera);

      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      this.renderer.xr.enabled = true;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setClearColor(this.backgroundColor, this.backgroundOpacity);
      this.canvas = this.renderer.domElement;
      Object.assign(this.canvas.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: this.sceneLayer === 'back' ? '0' : '450'
      });
      this.canvasParent.prepend(this.canvas);

      const ambient = new THREE.HemisphereLight(0xffffff, 0x606080, 1.6);
      ambient.name = '__jg3d_ambient';
      this.scene.add(ambient);
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.name = '__jg3d_key_light';
      key.position.set(5, 8, 10);
      this.scene.add(key);

      const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.resize()) : null;
      if (resizeObserver) resizeObserver.observe(this.canvasParent);
      this.resizeObserver = resizeObserver;
      window.addEventListener('resize', this._resizeHandler);
      this.resize();
      this.renderer.setAnimationLoop(() => {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.updateCameraAttachment();
        this.renderer.render(this.scene, this.camera);
      });
    }

    resize() {
      if (!this.renderer || !this.camera) return;
      const rect = this.canvasParent ? this.canvasParent.getBoundingClientRect() : null;
      const stageWidth = Number(runtime.stageWidth) || 480;
      const stageHeight = Number(runtime.stageHeight) || 360;
      const width = rect && rect.width > 0 ? rect.width : stageWidth;
      const height = rect && rect.height > 0 ? rect.height : stageHeight;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    dispose(removeScene = true) {
      if (this.xrSession) {
        try { this.xrSession.end(); } catch (error) {}
        this.xrSession = null;
      }
      if (this.renderer) {
        this.renderer.setAnimationLoop(null);
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentNode) this.renderer.domElement.remove();
      }
      if (this.resizeObserver) this.resizeObserver.disconnect();
      window.removeEventListener('resize', this._resizeHandler);
      if (this.vrButton && this.vrButton.parentNode) this.vrButton.remove();
      this.vrButton = null;
      this.renderer = null;
      this.canvas = null;
      this.canvasParent = null;
      this.scene = null;
      this.camera = null;
      this.cameraRig = null;
      this.objects.clear();
      this.controllers = [];
      this.followedObjectName = '';
      if (removeScene) this.lastError = '';
    }

    requireScene() {
      if (!this.scene || !this.renderer || !this.camera) throw new Error('Run “initialize 3D scene” first.');
    }

    addObject(type, args) {
      this.requireScene();
      const name = String(args.NAME || '').trim();
      if (!name) throw new Error('Object name cannot be empty.');
      if (this.scene.getObjectByName(name)) return;
      const THREE = this.THREE;
      const size = Math.max(0.001, Math.abs(toNumber(args.SIZE)) || 1);
      let geometry;
      if (type === 'cube') geometry = new THREE.BoxGeometry(size, size, size);
      else if (type === 'sphere') geometry = new THREE.SphereGeometry(size / 2, 32, 20);
      else geometry = new THREE.PlaneGeometry(size, size);
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68, metalness: 0, side: THREE.DoubleSide });
      const object = new THREE.Mesh(geometry, material);
      object.name = name;
      object.position.set(toNumber(args.X), toNumber(args.Y), toNumber(args.Z));
      this.scene.add(object);
      this.objects.set(name, object);
    }

    getObject(name) {
      return this.scene ? this.scene.getObjectByName(String(name || '')) : null;
    }

    updateCameraAttachment() {
      if (!this.cameraRig || !this.scene || !this.followedObjectName) return;
      const target = this.getObject(this.followedObjectName);
      if (!target) return;
      target.updateMatrixWorld(true);
      target.getWorldPosition(this.cameraRig.position);
      target.getWorldQuaternion(this.cameraRig.quaternion);
    }

    showVRButton() {
      if (!this.canvasParent) {
        const stageCanvas = this.getStageCanvas();
        if (stageCanvas && stageCanvas.parentElement) this.canvasParent = stageCanvas.parentElement;
      }
      if (!this.canvasParent) return;
      if (this.vrButton && this.vrButton.isConnected) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Enter VR';
      Object.assign(button.style, {
        position: 'absolute',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '1000',
        pointerEvents: 'auto',
        padding: '10px 16px',
        border: '0',
        borderRadius: '7px',
        background: '#7c35b8',
        color: '#ffffff',
        font: '600 14px system-ui, sans-serif',
        cursor: 'pointer'
      });
      button.addEventListener('click', async () => {
        button.textContent = 'Starting VR…';
        try {
          await this.startVR();
          button.remove();
          this.vrButton = null;
        } catch (error) {
          this.lastError = error && error.message ? error.message : String(error);
          button.textContent = `VR failed: ${this.lastError}`;
          button.title = this.lastError;
        }
      });
      this.canvasParent.appendChild(button);
      this.vrButton = button;
    }

    async startVR() {
      await this.initialize();
      if (!navigator.xr) throw new Error('This browser does not expose WebXR. Use a WebXR-compatible browser on HTTPS.');
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });
      try {
        this.renderer.xr.enabled = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');
        await this.renderer.xr.setSession(session);
        this.xrSession = session;
        this.makeControllers();
        session.addEventListener('end', () => {
          this.xrSession = null;
          this.controllers = [];
        }, { once: true });
        return true;
      } catch (error) {
        try { await session.end(); } catch (endError) {}
        throw error;
      }
    }

    makeControllers() {
      if (!this.renderer || !this.scene) return;
      this.controllers = [];
      for (let index = 0; index < 2; index++) {
        const controller = this.renderer.xr.getController(index);
        controller.name = `__jg3d_controller_${index + 1}`;
        this.scene.add(controller);
        this.controllers.push(controller);
      }
    }

    controllerInput(index) {
      if (!this.xrSession) return null;
      const sources = Array.from(this.xrSession.inputSources || []);
      const source = sources[index - 1];
      return source || null;
    }

    controllerObject(index) {
      return this.controllers[index - 1] || null;
    }

    controllerPosition(args) {
      const controller = this.controllerObject(Math.max(1, Math.floor(toNumber(args.INDEX))));
      const axis = String(args.AXIS || 'x');
      if (!controller || !['x', 'y', 'z'].includes(axis)) return '';
      return roundDegrees(controller.position[axis]);
    }

    controllerRotation(args) {
      const controller = this.controllerObject(Math.max(1, Math.floor(toNumber(args.INDEX))));
      const axis = String(args.AXIS || 'x');
      if (!controller || !['x', 'y', 'z'].includes(axis)) return '';
      return roundDegrees(controller.rotation[axis] * 180 / Math.PI);
    }

    controllerSide(args) {
      const source = this.controllerInput(Math.max(1, Math.floor(toNumber(args.INDEX))));
      return source ? source.handedness : '';
    }

    controllerStick(args) {
      const source = this.controllerInput(Math.max(1, Math.floor(toNumber(args.INDEX))));
      if (!source || !source.gamepad) return 0;
      const axis = String(args.AXIS || 'x').toLowerCase() === 'y' ? 3 : 2;
      return toNumber(source.gamepad.axes[axis]);
    }

    controllerTrigger(args) {
      const source = this.controllerInput(Math.max(1, Math.floor(toNumber(args.INDEX))));
      if (!source || !source.gamepad) return 0;
      const index = String(args.TRIGGER || 'back') === 'side' ? 1 : 0;
      return source.gamepad.buttons[index] ? toNumber(source.gamepad.buttons[index].value) : 0;
    }

    controllerButton(args, touched) {
      const source = this.controllerInput(Math.max(1, Math.floor(toNumber(args.INDEX))));
      if (!source || !source.gamepad) return false;
      const left = source.handedness === 'left';
      const button = String(args.BUTTON || '').toLowerCase();
      let index = -1;
      if (button === 'joystick') index = 3;
      if ((!left && button === 'a') || (left && button === 'x')) index = 4;
      if ((!left && button === 'b') || (left && button === 'y')) index = 5;
      if (button === 'back trigger') index = 0;
      if (button === 'side trigger') index = 1;
      const entry = source.gamepad.buttons[index];
      if (!entry) return false;
      return Boolean(touched ? entry.touched : entry.pressed);
    }
  }

  class Jg3DTurboWarp {
    constructor(engine) { this.engine = engine; }
    getInfo() {
      return {
        id: 'jg3d',
        name: '3D',
        color1: '#B100FE',
        color2: '#8000BC',
        blocks: [
          { opcode: 'initialize', blockType: Command, text: 'initialize 3D scene' },
          { opcode: 'dispose', blockType: Command, text: 'dispose 3D scene' },
          '---',
          { opcode: 'addCube', blockType: Command, text: 'add cube [NAME] at x [X] y [Y] z [Z] size [SIZE]', arguments: { NAME: { type: StringType, defaultValue: 'Cube1' }, X: { type: NumberType, defaultValue: 0 }, Y: { type: NumberType, defaultValue: 0 }, Z: { type: NumberType, defaultValue: 0 }, SIZE: { type: NumberType, defaultValue: 2 } } },
          { opcode: 'addSphere', blockType: Command, text: 'add sphere [NAME] at x [X] y [Y] z [Z] size [SIZE]', arguments: { NAME: { type: StringType, defaultValue: 'Sphere1' }, X: { type: NumberType, defaultValue: 0 }, Y: { type: NumberType, defaultValue: 0 }, Z: { type: NumberType, defaultValue: 0 }, SIZE: { type: NumberType, defaultValue: 2 } } },
          { opcode: 'addPlane', blockType: Command, text: 'add plane [NAME] at x [X] y [Y] z [Z] size [SIZE]', arguments: { NAME: { type: StringType, defaultValue: 'Plane1' }, X: { type: NumberType, defaultValue: 0 }, Y: { type: NumberType, defaultValue: 0 }, Z: { type: NumberType, defaultValue: 0 }, SIZE: { type: NumberType, defaultValue: 5 } } },
          { opcode: 'removeObject', blockType: Command, text: 'remove object [NAME]', arguments: { NAME: { type: StringType, defaultValue: 'Cube1' } } },
          { opcode: 'setObjectPosition', blockType: Command, text: 'set object [NAME] position x [X] y [Y] z [Z]', arguments: { NAME: { type: StringType, defaultValue: 'Cube1' }, X: { type: NumberType, defaultValue: 0 }, Y: { type: NumberType, defaultValue: 0 }, Z: { type: NumberType, defaultValue: 0 } } },
          { opcode: 'setObjectRotation', blockType: Command, text: 'set object [NAME] rotation x [X] y [Y] z [Z]', arguments: { NAME: { type: StringType, defaultValue: 'Cube1' }, X: { type: NumberType, defaultValue: 0 }, Y: { type: NumberType, defaultValue: 0 }, Z: { type: NumberType, defaultValue: 0 } } },
          { opcode: 'setObjectScale', blockType: Command, text: 'set object [NAME] scale x [X] y [Y] z [Z]', arguments: { NAME: { type: StringType, defaultValue: 'Cube1' }, X: { type: NumberType, defaultValue: 1 }, Y: { type: NumberType, defaultValue: 1 }, Z: { type: NumberType, defaultValue: 1 } } },
          { opcode: 'setObjectColor', blockType: Command, text: 'set object [NAME] color [COLOR]', arguments: { NAME: { type: StringType, defaultValue: 'Cube1' }, COLOR: { type: ColorType } } },
          { opcode: 'getObjectPosition', blockType: Reporter, text: 'object [NAME] position [AXIS]', arguments: { NAME: { type: StringType, defaultValue: 'Cube1' }, AXIS: { type: StringType, menu: 'axis' } } },
          '---',
          { opcode: 'setCameraPosition', blockType: Command, text: 'set camera position x [X] y [Y] z [Z]', arguments: { X: { type: NumberType, defaultValue: 0 }, Y: { type: NumberType, defaultValue: 0 }, Z: { type: NumberType, defaultValue: 12 } } },
          { opcode: 'setCameraRotation', blockType: Command, text: 'set camera rotation x [X] y [Y] z [Z]', arguments: { X: { type: NumberType, defaultValue: 0 }, Y: { type: NumberType, defaultValue: 0 }, Z: { type: NumberType, defaultValue: 0 } } },
          { opcode: 'cameraLookAt', blockType: Command, text: 'camera look at x [X] y [Y] z [Z]', arguments: { X: { type: NumberType, defaultValue: 0 }, Y: { type: NumberType, defaultValue: 0 }, Z: { type: NumberType, defaultValue: 0 } } },
          { opcode: 'setBackgroundColor', blockType: Command, text: 'set 3D background color [COLOR]', arguments: { COLOR: { type: ColorType } } },
          { opcode: 'setBackgroundOpacity', blockType: Command, text: 'set 3D background opacity [OPACITY] %', arguments: { OPACITY: { type: NumberType, defaultValue: 0 } } },
          { opcode: 'objectExists', blockType: BooleanType, text: '3D object [NAME] exists?', arguments: { NAME: { type: StringType, defaultValue: 'Cube1' } } }
        ],
        menus: { axis: { acceptReporters: true, items: ['x', 'y', 'z'] } }
      };
    }
    async initialize() { try { await this.engine.initialize(); } catch (error) { this.engine.lastError = error.message || String(error); console.error(this.engine.lastError); } }
    dispose() { this.engine.dispose(); }
    addCube(args) { try { this.engine.addObject('cube', args); } catch (error) { console.error(error); } }
    addSphere(args) { try { this.engine.addObject('sphere', args); } catch (error) { console.error(error); } }
    addPlane(args) { try { this.engine.addObject('plane', args); } catch (error) { console.error(error); } }
    removeObject(args) { const obj = this.engine.getObject(args.NAME); if (obj && obj !== this.engine.cameraRig && !String(obj.name).startsWith('__jg3d_')) { obj.parent && obj.parent.remove(obj); this.engine.objects.delete(String(args.NAME)); } }
    setObjectPosition(args) { const obj = this.engine.getObject(args.NAME); if (obj) obj.position.set(toNumber(args.X), toNumber(args.Y), toNumber(args.Z)); }
    setObjectRotation(args) { const obj = this.engine.getObject(args.NAME); if (obj) obj.rotation.set(toNumber(args.X) * Math.PI / 180, toNumber(args.Y) * Math.PI / 180, toNumber(args.Z) * Math.PI / 180); }
    setObjectScale(args) { const obj = this.engine.getObject(args.NAME); if (obj) obj.scale.set(toNumber(args.X), toNumber(args.Y), toNumber(args.Z)); }
    setObjectColor(args) { const obj = this.engine.getObject(args.NAME); if (!obj) return; obj.traverse(child => { if (child.material && child.material.color) child.material.color.set(toColor(args.COLOR)); }); }
    getObjectPosition(args) { const obj = this.engine.getObject(args.NAME); const axis = String(args.AXIS); return obj && ['x', 'y', 'z'].includes(axis) ? obj.position[axis] : ''; }
    setCameraPosition(args) { const c = this.engine.camera; if (c) c.position.set(toNumber(args.X), toNumber(args.Y), toNumber(args.Z)); }
    setCameraRotation(args) { const c = this.engine.camera; if (c) c.rotation.set(toNumber(args.X) * Math.PI / 180, toNumber(args.Y) * Math.PI / 180, toNumber(args.Z) * Math.PI / 180); }
    cameraLookAt(args) { const c = this.engine.camera; if (c) c.lookAt(toNumber(args.X), toNumber(args.Y), toNumber(args.Z)); }
    setBackgroundColor(args) { this.engine.backgroundColor = toColor(args.COLOR); if (this.engine.renderer) this.engine.renderer.setClearColor(this.engine.backgroundColor, this.engine.backgroundOpacity); }
    setBackgroundOpacity(args) { this.engine.backgroundOpacity = Math.max(0, Math.min(100, toNumber(args.OPACITY))) / 100; if (this.engine.renderer) this.engine.renderer.setClearColor(this.engine.backgroundColor, this.engine.backgroundOpacity); }
    objectExists(args) { return Boolean(this.engine.getObject(args.NAME)); }
  }

  class Jg3DVRTurboWarp {
    constructor(engine) { this.engine = engine; }
    getInfo() {
      return {
        id: 'jg3dVr',
        name: '3D VR',
        color1: '#B100FE',
        color2: '#8000BC',
        blocks: [
          { opcode: 'isSupported', blockType: BooleanType, text: 'is VR supported?', disableMonitor: true },
          { opcode: 'createSession', blockType: Command, text: 'create VR session' },
          { opcode: 'showVRButton', blockType: Command, text: 'show Enter VR button' },
          { opcode: 'closeSession', blockType: Command, text: 'close VR session' },
          { opcode: 'isOpened', blockType: BooleanType, text: 'is VR open?', disableMonitor: true },
          '---',
          { opcode: 'attachObject', blockType: Command, text: 'attach camera to object named [OBJECT]', arguments: { OBJECT: { type: StringType, defaultValue: 'Object1' } } },
          { opcode: 'detachObject', blockType: Command, text: 'detach camera from object' },
          '---',
          { opcode: 'getControllerPosition', blockType: Reporter, text: 'controller #[INDEX] position [AXIS]', disableMonitor: true, arguments: { INDEX: { type: NumberType, defaultValue: 1 }, AXIS: { type: StringType, menu: 'axis' } } },
          { opcode: 'getControllerRotation', blockType: Reporter, text: 'controller #[INDEX] rotation [AXIS]', disableMonitor: true, arguments: { INDEX: { type: NumberType, defaultValue: 1 }, AXIS: { type: StringType, menu: 'axis' } } },
          { opcode: 'getControllerSide', blockType: Reporter, text: 'side of controller #[INDEX]', disableMonitor: true, arguments: { INDEX: { type: NumberType, defaultValue: 1 } } },
          { opcode: 'getControllerStick', blockType: Reporter, text: 'joystick axis [AXIS] of controller #[INDEX]', disableMonitor: true, arguments: { AXIS: { type: StringType, menu: 'xy' }, INDEX: { type: NumberType, defaultValue: 1 } } },
          { opcode: 'getControllerTrig', blockType: Reporter, text: 'analog value of [TRIGGER] trigger on controller #[INDEX]', disableMonitor: true, arguments: { TRIGGER: { type: StringType, menu: 'trigger' }, INDEX: { type: NumberType, defaultValue: 1 } } },
          { opcode: 'getControllerButton', blockType: BooleanType, text: 'button [BUTTON] on controller #[INDEX] pressed?', disableMonitor: true, arguments: { BUTTON: { type: StringType, menu: 'button' }, INDEX: { type: NumberType, defaultValue: 1 } } },
          { opcode: 'getControllerTouching', blockType: BooleanType, text: '[BUTTON] on controller #[INDEX] touched?', disableMonitor: true, arguments: { BUTTON: { type: StringType, menu: 'buttonAll' }, INDEX: { type: NumberType, defaultValue: 1 } } }
        ],
        menus: {
          axis: { acceptReporters: true, items: ['x', 'y', 'z'] },
          xy: { acceptReporters: true, items: ['x', 'y'] },
          trigger: { acceptReporters: true, items: ['back', 'side'] },
          button: { acceptReporters: true, items: ['a', 'b', 'x', 'y', 'joystick'] },
          buttonAll: { acceptReporters: true, items: ['a', 'b', 'x', 'y', 'joystick', 'back trigger', 'side trigger'] }
        }
      };
    }
    isSupported() { return Boolean(this.engine.xrSupported); }
    async createSession() {
      try { await this.engine.startVR(); }
      catch (error) { this.engine.lastError = error && error.message ? error.message : String(error); this.engine.showVRButton(); console.warn(`jg3dVr: ${this.engine.lastError}`); }
    }
    showVRButton() { this.engine.showVRButton(); }
    async closeSession() { if (this.engine.xrSession) { try { await this.engine.xrSession.end(); } catch (error) {} } }
    isOpened() { return Boolean(this.engine.xrSession && this.engine.renderer && this.engine.renderer.xr.isPresenting); }
    attachObject(args) { this.engine.followedObjectName = String(args.OBJECT || ''); }
    detachObject() { this.engine.followedObjectName = ''; if (this.engine.cameraRig) { this.engine.cameraRig.position.set(0, 0, 0); this.engine.cameraRig.quaternion.identity(); } }
    getControllerPosition(args) { return this.engine.controllerPosition(args); }
    getControllerRotation(args) { return this.engine.controllerRotation(args); }
    getControllerSide(args) { return this.engine.controllerSide(args); }
    getControllerStick(args) { return this.engine.controllerStick(args); }
    getControllerTrig(args) { return this.engine.controllerTrigger(args); }
    getControllerButton(args) { return this.engine.controllerButton(args, false); }
    getControllerTouching(args) { const button = String(args.BUTTON || '').toLowerCase(); const aliases = { 'a button': 'a', 'b button': 'b', 'x button': 'x', 'y button': 'y' }; return this.engine.controllerButton({ INDEX: args.INDEX, BUTTON: aliases[button] || button }, true); }
  }

  let activeEngine = null;
  const pendingEngineValues = {};
  const engineReady = import(THREE_MODULE_URL).then(THREE => {
    activeEngine = new Jg3DEngine(THREE);
    Object.assign(activeEngine, pendingEngineValues);
    runtime.ext_jg3d = activeEngine;
    return activeEngine;
  }).catch(error => {
    console.error('Unable to load Three.js for the jg3d TurboWarp port. Check your internet connection and WebGL support.', error);
    return null;
  });

  const engineProxy = new Proxy({}, {
    get(target, property) {
      if (activeEngine) {
        const value = activeEngine[property];
        return typeof value === 'function' ? value.bind(activeEngine) : value;
      }
      return (...args) => engineReady.then(engine => {
        if (!engine) throw new Error('Three.js did not load. Check the browser console and internet connection.');
        const value = engine[property];
        return typeof value === 'function' ? value.apply(engine, args) : value;
      }).catch(error => {
        console.error(error);
        return undefined;
      });
    },
    set(target, property, value) {
      if (activeEngine) activeEngine[property] = value;
      else pendingEngineValues[property] = value;
      return true;
    }
  });

  Scratch.extensions.register(new Jg3DTurboWarp(engineProxy));
  Scratch.extensions.register(new Jg3DVRTurboWarp(engineProxy));
})(Scratch);
