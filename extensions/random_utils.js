// Made with PenguinBuilder 2.6
// use PenguinBuilder at "https://chickencuber.github.io/PenguinBuilder/"
(function(Scratch) {
  const blocks = [];
  const vars = {};
  const menus = {};

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Random Utils must run unsandboxed');
  }

  class Extension {
    getInfo() {
      return {
        "id": "randomutils",
        "name": "Random Utils",
        "color1": "#002cb9",
        "blocks": blocks,
        "menus": menus,
      }
    }
  }
  
function colourRandom() {
  var num = Math.floor(Math.random() * Math.pow(2, 24));
  return '#' + ('00000' + num.toString(16)).substr(-6);
}

function colourBlend(c1, c2, ratio) {
  ratio = Math.max(Math.min(Number(ratio), 1), 0);
  var r1 = parseInt(c1.substring(1, 3), 16);
  var g1 = parseInt(c1.substring(3, 5), 16);
  var b1 = parseInt(c1.substring(5, 7), 16);
  var r2 = parseInt(c2.substring(1, 3), 16);
  var g2 = parseInt(c2.substring(3, 5), 16);
  var b2 = parseInt(c2.substring(5, 7), 16);
  var r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  var g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  var b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  r = ('0' + (r || 0).toString(16)).slice(-2);
  g = ('0' + (g || 0).toString(16)).slice(-2);
  b = ('0' + (b || 0).toString(16)).slice(-2);
  return '#' + r + g + b;
}



blocks.push({
  opcode: "randomutils_Block_alert",
  blockType: Scratch.BlockType.COMMAND,
  text: "alert with text [text]",
  arguments: {
      "text": {
      type: Scratch.ArgumentType.STRING,
      defaultValue: `Are you cool?`
    },

  },
  disableMonitor: false
});
Extension.prototype["randomutils_Block_alert"] = function(args, util) {
  const localVars = {};
    alert(args["text"]);

};


blocks.push({
  opcode: "randomutils_Block_bool",
  blockType: Scratch.BlockType.BOOLEAN,
  text: "random boolean",
  arguments: {

  },
  disableMonitor: true
});
Extension.prototype["randomutils_Block_bool"] = function(args, util) {
  const localVars = {};
    return (Math.round(Math.random()) === 1);
};


blocks.push({
  opcode: "randomutils_Block_random_color",
  blockType: Scratch.BlockType.REPORTER,
  text: "random color",
  arguments: {

  },
  disableMonitor: true
});
Extension.prototype["randomutils_Block_random_color"] = function(args, util) {
  const localVars = {};
    return colourRandom();
};


blocks.push({
  opcode: "randomutils_Block_color_merge",
  blockType: Scratch.BlockType.REPORTER,
  text: "blend colors, [a] and [b], with ratio [ratio]",
  arguments: {
      "a": {
      type: Scratch.ArgumentType.STRING,
      defaultValue: `#51fde1`
    },
  "b": {
      type: Scratch.ArgumentType.STRING,
      defaultValue: `#4be810`
    },
  "ratio": {
      type: Scratch.ArgumentType.STRING,
      defaultValue: `0.5`
    },

  },
  disableMonitor: true
});
Extension.prototype["randomutils_Block_color_merge"] = function(args, util) {
  const localVars = {};
    return colourBlend(args["a"], args["b"], args["ratio"]);
};



  Scratch.extensions.register(new Extension());
})(Scratch);
