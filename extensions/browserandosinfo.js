// Browser & OS Info
// Created by @redspacecat

(function(Scratch) {
  'use strict';
  let newScript = document.createElement("script")
  newScript.src = "https://cdn.jsdelivr.net/npm/bowser@latest/bundled.js"
  document.getElementsByTagName("head")[0].appendChild(newScript)

  class BrowserAndOSInfo {
    getInfo() {
      return {
        id: "browserinfo",
        name: "Browser & OS Info",
        color1: "#449462",
        color2: "#35754d",
        color3: "#35754d",
        blocks: [
          {
            opcode: 'getBrowserName',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get browser name',
            disableMonitor: true,
          },
          {
            opcode: 'getBrowserVersion',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get browser version',
            disableMonitor: true,
          },
          {
            opcode: 'getOSName',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get OS name',
            disableMonitor: true,
          },
          {
            opcode: 'getOSVersion',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get OS version',
            disableMonitor: true,
          },
          {
            opcode: 'getPlatform',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get platform',
            disableMonitor: true,
          },
          {
            opcode: 'getRenderingEngine',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get rendering engine',
            disableMonitor: true,
          }
        ]
      };
    }

    getBowser() {
      try {
        let b = bowser.getParser(window.navigator.userAgent)
        return b
      }
      catch {
        return "script still loading!"
      }
    }

    getBrowserName() {
      const browser = this.getBowser()
      return browser.getBrowserName()  
    }

    getBrowserVersion() {
      const browser = this.getBowser()
      return browser.getBrowserVersion()
    }

    getOSName() {
      const browser = this.getBowser()
      return browser.getOSName()  
    }

    getOSVersion() {
      const browser = this.getBowser()
      return browser.getOS().versionName
    }

    getPlatform() {
      const browser = this.getBowser()
      return browser.getPlatformType()
    }

    getRenderingEngine() {
      const browser = this.getBowser()
      return browser.getEngineName()
    }
  }

  Scratch.extensions.register(new BrowserAndOSInfo());
})(Scratch);
