// URL Info extension
// Made by @redspacecat

(function(Scratch) {
  'use strict';

  class URLInfo {
    getInfo() {
      return {
        id: "urlinfo",
        name: "URL Info",
        color1: "#3d97c2",
        color2: "#2f7293",
        color3: "#2f7293",
        blocks: [
          {
            opcode: 'getURL',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get URL',
            disableMonitor: true,
          },
          {
            opcode: 'getHost',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get domain',
            disableMonitor: true,
          },
          {
            opcode: 'getPath',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get path',
            disableMonitor: true,
          },
          {
            opcode: 'getHash',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get hash',
            disableMonitor: true,
          },
          {
            opcode: 'getParams',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get params',
            disableMonitor: true,
          },
          {
            opcode: 'getProtocal',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get protocal',
            disableMonitor: true,
          }
        ]
      };
    }

    getURL() {
      return window.location.href
    }

    getHost() {
      return window.location.hostname
    }

    getPath() {
      return window.location.pathname
    }

    getHash() {
      return window.location.hash
    }

    getParams() {
      return window.location.search
    }

    getProtocal() {
      return window.location.protocol
    }
  }

  Scratch.extensions.register(new URLInfo());
})(Scratch);
