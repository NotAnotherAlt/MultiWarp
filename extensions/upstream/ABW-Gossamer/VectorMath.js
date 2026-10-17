// Vector Math (2D and 3D)
// Original extension by ABW: https://github.com/ABW-Gossamer/ABW-Extensions
// English block labels localized by MultiWarp; see LICENSE for the MIT license.

(function(Scratch) {
  'use strict';

  // 检查 Scratch 环境是否可用
  if (!Scratch.extensions.unsandboxed) {
    throw new Error('此扩展必须在 TurboWarp 的非沙盒模式下运行，或者使用官方的扩展加载器。');
  }

  // 辅助函数：安全地解析 JSON 格式的向量
  function parseVector(input, expectedType) {
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        if (expectedType === 'Vector2' && Array.isArray(parsed) && parsed.length === 2) {
          return { x: parsed[0], y: parsed[1], type: 'Vector2' };
        } else if (expectedType === 'Vector3' && Array.isArray(parsed) && parsed.length === 3) {
          return { x: parsed[0], y: parsed[1], z: parsed[2], type: 'Vector3' };
        } else if (expectedType === 'Vector2' && parsed.x !== undefined && parsed.y !== undefined && parsed.z === undefined) {
          return { x: parsed.x, y: parsed.y, type: 'Vector2' };
        } else if (expectedType === 'Vector3' && parsed.x !== undefined && parsed.y !== undefined && parsed.z !== undefined) {
          return { x: parsed.x, y: parsed.y, z: parsed.z, type: 'Vector3' };
        }
      } catch (e) {
        // 解析失败，继续尝试其他格式
      }
    }
    // 如果不是 JSON，尝试解析为 "x,y" 或 "x,y,z" 格式
    if (typeof input === 'string') {
      const parts = input.split(',').map(Number);
      if (expectedType === 'Vector2' && parts.length === 2 && parts.every(v => !isNaN(v))) {
        return { x: parts[0], y: parts[1], type: 'Vector2' };
      } else if (expectedType === 'Vector3' && parts.length === 3 && parts.every(v => !isNaN(v))) {
        return { x: parts[0], y: parts[1], z: parts[2], type: 'Vector3' };
      }
    }
    // 默认返回零向量
    if (expectedType === 'Vector2') {
      return { x: 0, y: 0, type: 'Vector2' };
    } else {
      return { x: 0, y: 0, z: 0, type: 'Vector3' };
    }
  }

  // 格式化向量为 JSON 字符串，便于存储和传递
  function formatVector(vec) {
    if (vec.type === 'Vector2') {
      return JSON.stringify([vec.x, vec.y]);
    } else {
      return JSON.stringify([vec.x, vec.y, vec.z]);
    }
  }

  class VectorMathExtension {
    constructor() {
      // 存储用户创建的命名向量，便于复用
      this.variables = {};
    }

    getInfo() {
      return {
        id: 'vectormath',
        name: 'Vector Math',
        color1: '#4C97FF',
        color2: '#3373CC',
        blocks: [
          {
            opcode: 'createVector2',
            blockType: Scratch.BlockType.REPORTER,
            text: 'create 2D vector [X] [Y]',
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
            }
          },
          {
            opcode: 'createVector3',
            blockType: Scratch.BlockType.REPORTER,
            text: 'create 3D vector [X] [Y] [Z]',
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Z: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
            }
          },
          {
            opcode: 'storeVector',
            blockType: Scratch.BlockType.COMMAND,
            text: 'store vector [VECTOR] as [NAME]',
            arguments: {
              VECTOR: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'myVec' }
            }
          },
          {
            opcode: 'recallVector',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get stored vector [NAME]',
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'myVec' }
            }
          },
          '---',
          {
            opcode: 'vectorAdd',
            blockType: Scratch.BlockType.REPORTER,
            text: 'vector [VEC1] + [VEC2]',
            arguments: {
              VEC1: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' },
              VEC2: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' }
            }
          },
          {
            opcode: 'vectorSubtract',
            blockType: Scratch.BlockType.REPORTER,
            text: 'vector [VEC1] - [VEC2]',
            arguments: {
              VEC1: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' },
              VEC2: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' }
            }
          },
          {
            opcode: 'vectorMultiply',
            blockType: Scratch.BlockType.REPORTER,
            text: 'vector [VEC] × scalar [SCALAR]',
            arguments: {
              VEC: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' },
              SCALAR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          {
            opcode: 'vectorDivide',
            blockType: Scratch.BlockType.REPORTER,
            text: 'vector [VEC] ÷ scalar [SCALAR]',
            arguments: {
              VEC: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' },
              SCALAR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          '---',
          {
            opcode: 'vectorDot',
            blockType: Scratch.BlockType.REPORTER,
            text: 'dot product [VEC1] · [VEC2]',
            arguments: {
              VEC1: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' },
              VEC2: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' }
            }
          },
          {
            opcode: 'vectorCross',
            blockType: Scratch.BlockType.REPORTER,
            text: 'cross product [VEC1] × [VEC2] (3D only)',
            arguments: {
              VEC1: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0,0]' },
              VEC2: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0,0]' }
            }
          },
          {
            opcode: 'vectorMagnitude',
            blockType: Scratch.BlockType.REPORTER,
            text: 'magnitude of [VEC]',
            arguments: {
              VEC: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' }
            }
          },
          {
            opcode: 'vectorNormalize',
            blockType: Scratch.BlockType.REPORTER,
            text: 'normalize [VEC]',
            arguments: {
              VEC: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' }
            }
          },
          {
            opcode: 'vectorDistance',
            blockType: Scratch.BlockType.REPORTER,
            text: 'distance between [VEC1] and [VEC2]',
            arguments: {
              VEC1: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' },
              VEC2: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' }
            }
          },
          '---',
          {
            opcode: 'vectorLerp',
            blockType: Scratch.BlockType.REPORTER,
            text: 'lerp [VEC1] to [VEC2] by [T]',
            arguments: {
              VEC1: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' },
              VEC2: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,1]' },
              T: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5 }
            }
          },
          {
            opcode: 'vectorAngle',
            blockType: Scratch.BlockType.REPORTER,
            text: 'angle of 2D vector [VEC] (degrees)',
            arguments: {
              VEC: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,0]' }
            }
          },
          {
            opcode: 'vectorRotate',
            blockType: Scratch.BlockType.REPORTER,
            text: 'rotate 2D vector [VEC] by [ANGLE] degrees',
            arguments: {
              VEC: { type: Scratch.ArgumentType.STRING, defaultValue: '[1,0]' },
              ANGLE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 90 }
            }
          },
          '---',
          {
            opcode: 'vectorComponents',
            blockType: Scratch.BlockType.REPORTER,
            text: '[COMP] component of [VEC]',
            arguments: {
              VEC: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0,0]' },
              COMP: {
                type: Scratch.ArgumentType.STRING,
                menu: 'componentMenu',
                defaultValue: 'x'
              }
            }
          },
          {
            opcode: 'vectorToString',
            blockType: Scratch.BlockType.REPORTER,
            text: 'vector [VEC] as text',
            arguments: {
              VEC: { type: Scratch.ArgumentType.STRING, defaultValue: '[0,0]' }
            }
          }
        ],
        menus: {
          componentMenu: {
            acceptReporters: true,
            items: ['x', 'y', 'z']
          }
        }
      };
    }

    // 辅助：解析输入，自动识别类型（2D/3D）
    _parseInput(input) {
      if (typeof input === 'string' && this.variables[input]) {
        return this.variables[input];
      }
      // 尝试解析为 JSON 或 CSV
      let parsed = null;
      try {
        parsed = JSON.parse(input);
      } catch(e) {}
      if (parsed && Array.isArray(parsed)) {
        if (parsed.length === 2) return { x: parsed[0], y: parsed[1], type: 'Vector2' };
        if (parsed.length === 3) return { x: parsed[0], y: parsed[1], z: parsed[2], type: 'Vector3' };
      } else if (parsed && typeof parsed === 'object' && parsed.x !== undefined) {
        if (parsed.z !== undefined) return { x: parsed.x, y: parsed.y, z: parsed.z, type: 'Vector3' };
        else return { x: parsed.x, y: parsed.y, type: 'Vector2' };
      }
      // CSV 格式
      const parts = input.split(',').map(Number);
      if (parts.length === 2 && parts.every(v => !isNaN(v))) {
        return { x: parts[0], y: parts[1], type: 'Vector2' };
      }
      if (parts.length === 3 && parts.every(v => !isNaN(v))) {
        return { x: parts[0], y: parts[1], z: parts[2], type: 'Vector3' };
      }
      // 默认返回零向量
      return { x: 0, y: 0, type: 'Vector2' };
    }

    createVector2(args) {
      const x = Number(args.X);
      const y = Number(args.Y);
      return formatVector({ x, y, type: 'Vector2' });
    }

    createVector3(args) {
      const x = Number(args.X);
      const y = Number(args.Y);
      const z = Number(args.Z);
      return formatVector({ x, y, z, type: 'Vector3' });
    }

    storeVector(args) {
      const vec = this._parseInput(args.VECTOR);
      const name = args.NAME;
      this.variables[name] = vec;
    }

    recallVector(args) {
      const name = args.NAME;
      if (this.variables[name]) {
        return formatVector(this.variables[name]);
      }
      return formatVector({ x: 0, y: 0, type: 'Vector2' });
    }

    // 运算辅助：确保两个向量类型一致，若不一致则升级为3D
    _alignTypes(vec1, vec2) {
      if (vec1.type === 'Vector3' || vec2.type === 'Vector3') {
        const v1 = vec1.type === 'Vector3' ? vec1 : { x: vec1.x, y: vec1.y, z: 0, type: 'Vector3' };
        const v2 = vec2.type === 'Vector3' ? vec2 : { x: vec2.x, y: vec2.y, z: 0, type: 'Vector3' };
        return [v1, v2, 'Vector3'];
      }
      return [vec1, vec2, 'Vector2'];
    }

    vectorAdd(args) {
      let v1 = this._parseInput(args.VEC1);
      let v2 = this._parseInput(args.VEC2);
      const [a, b, type] = this._alignTypes(v1, v2);
      if (type === 'Vector2') {
        return formatVector({ x: a.x + b.x, y: a.y + b.y, type: 'Vector2' });
      } else {
        return formatVector({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z, type: 'Vector3' });
      }
    }

    vectorSubtract(args) {
      let v1 = this._parseInput(args.VEC1);
      let v2 = this._parseInput(args.VEC2);
      const [a, b, type] = this._alignTypes(v1, v2);
      if (type === 'Vector2') {
        return formatVector({ x: a.x - b.x, y: a.y - b.y, type: 'Vector2' });
      } else {
        return formatVector({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z, type: 'Vector3' });
      }
    }

    vectorMultiply(args) {
      let v = this._parseInput(args.VEC);
      const s = Number(args.SCALAR);
      if (v.type === 'Vector2') {
        return formatVector({ x: v.x * s, y: v.y * s, type: 'Vector2' });
      } else {
        return formatVector({ x: v.x * s, y: v.y * s, z: v.z * s, type: 'Vector3' });
      }
    }

    vectorDivide(args) {
      let v = this._parseInput(args.VEC);
      const s = Number(args.SCALAR);
      if (s === 0) return formatVector({ x: 0, y: 0, type: 'Vector2' }); // 避免除零
      if (v.type === 'Vector2') {
        return formatVector({ x: v.x / s, y: v.y / s, type: 'Vector2' });
      } else {
        return formatVector({ x: v.x / s, y: v.y / s, z: v.z / s, type: 'Vector3' });
      }
    }

    vectorDot(args) {
      let v1 = this._parseInput(args.VEC1);
      let v2 = this._parseInput(args.VEC2);
      const [a, b, type] = this._alignTypes(v1, v2);
      if (type === 'Vector2') {
        return a.x * b.x + a.y * b.y;
      } else {
        return a.x * b.x + a.y * b.y + a.z * b.z;
      }
    }

    vectorCross(args) {
      let v1 = this._parseInput(args.VEC1);
      let v2 = this._parseInput(args.VEC2);
      // 强制转为三维，叉积仅在三维中有定义
      const a = v1.type === 'Vector3' ? v1 : { x: v1.x, y: v1.y, z: 0, type: 'Vector3' };
      const b = v2.type === 'Vector3' ? v2 : { x: v2.x, y: v2.y, z: 0, type: 'Vector3' };
      const cx = a.y * b.z - a.z * b.y;
      const cy = a.z * b.x - a.x * b.z;
      const cz = a.x * b.y - a.y * b.x;
      return formatVector({ x: cx, y: cy, z: cz, type: 'Vector3' });
    }

    vectorMagnitude(args) {
      let v = this._parseInput(args.VEC);
      if (v.type === 'Vector2') {
        return Math.hypot(v.x, v.y);
      } else {
        return Math.hypot(v.x, v.y, v.z);
      }
    }

    vectorNormalize(args) {
      let v = this._parseInput(args.VEC);
      const mag = this.vectorMagnitude({ VEC: args.VEC });
      if (mag === 0) return formatVector(v.type === 'Vector2' ? { x: 0, y: 0, type: 'Vector2' } : { x: 0, y: 0, z: 0, type: 'Vector3' });
      if (v.type === 'Vector2') {
        return formatVector({ x: v.x / mag, y: v.y / mag, type: 'Vector2' });
      } else {
        return formatVector({ x: v.x / mag, y: v.y / mag, z: v.z / mag, type: 'Vector3' });
      }
    }

    vectorDistance(args) {
      let v1 = this._parseInput(args.VEC1);
      let v2 = this._parseInput(args.VEC2);
      const [a, b, type] = this._alignTypes(v1, v2);
      if (type === 'Vector2') {
        return Math.hypot(a.x - b.x, a.y - b.y);
      } else {
        return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      }
    }

    vectorLerp(args) {
      let v1 = this._parseInput(args.VEC1);
      let v2 = this._parseInput(args.VEC2);
      const t = Math.min(1, Math.max(0, Number(args.T))); // 钳制到 [0,1]
      const [a, b, type] = this._alignTypes(v1, v2);
      if (type === 'Vector2') {
        return formatVector({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          type: 'Vector2'
        });
      } else {
        return formatVector({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z: a.z + (b.z - a.z) * t,
          type: 'Vector3'
        });
      }
    }

    vectorAngle(args) {
      let v = this._parseInput(args.VEC);
      if (v.type === 'Vector3') {
        // 对于三维向量，返回与X轴夹角 (在XY平面内)
        return Math.atan2(v.y, v.x) * 180 / Math.PI;
      } else {
        return Math.atan2(v.y, v.x) * 180 / Math.PI;
      }
    }

    vectorRotate(args) {
      let v = this._parseInput(args.VEC);
      const angleRad = Number(args.ANGLE) * Math.PI / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      if (v.type === 'Vector2') {
        const x2 = v.x * cos - v.y * sin;
        const y2 = v.x * sin + v.y * cos;
        return formatVector({ x: x2, y: y2, type: 'Vector2' });
      } else {
        // 旋转三维向量的X,Y分量，保持Z不变
        const x2 = v.x * cos - v.y * sin;
        const y2 = v.x * sin + v.y * cos;
        return formatVector({ x: x2, y: y2, z: v.z, type: 'Vector3' });
      }
    }

    vectorComponents(args) {
      let v = this._parseInput(args.VEC);
      const comp = args.COMP;
      if (comp === 'x') return v.x;
      if (comp === 'y') return v.y;
      if (comp === 'z') return v.z !== undefined ? v.z : 0;
      return 0;
    }

    vectorToString(args) {
      let v = this._parseInput(args.VEC);
      if (v.type === 'Vector2') {
        return `(${v.x}, ${v.y})`;
      } else {
        return `(${v.x}, ${v.y}, ${v.z})`;
      }
    }
  }

  Scratch.extensions.register(new VectorMathExtension());
})(Scratch);