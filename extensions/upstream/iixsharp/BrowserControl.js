// Creator: iiSharp
// YouTube: https://www.youtube.com/@iisharp
// Version: 1.0.0

(function(Scratch) {
  'use strict';

  class BrowserControlExtension {
    getInfo() {
      return {
        id: 'browserControl',
        name: 'Browser Control',
        blocks: [
          {
            opcode: 'changeURL',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Go to [URL]',
            arguments: {
              URL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'https://example.com'
              }
            }
          },
          {
            opcode: 'openLink',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Open link [LINK]',
            arguments: {
              LINK: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'https://example.com'
              }
            }
          },
          {
            opcode: 'getWidth',
            blockType: Scratch.BlockType.REPORTER,
            text: 'browser window width',
          },
          {
            opcode: 'getHeight',
            blockType: Scratch.BlockType.REPORTER,
            text: 'browser window height',
          }
        ]
      };
    }

    changeURL({ URL }) {
      if (window.__MULTIWARP_OFFLINE__) {
        console.warn('Browser navigation is unavailable in the offline build.');
        return;
      }
      const safeURL = this._getWebURL(URL);
      if (safeURL) {
        window.location.href = safeURL;
      } else {
        console.error('Invalid URL: only HTTP and HTTPS URLs are allowed.', URL);
      }
    }

    openLink({ LINK }) {
      if (window.__MULTIWARP_OFFLINE__) {
        console.warn('Opening external links is unavailable in the offline build.');
        return;
      }
      const safeURL = this._getWebURL(LINK);
      if (safeURL) {
        window.open(safeURL, '_blank', 'noopener,noreferrer');
      } else {
        console.error('Invalid link: only HTTP and HTTPS URLs are allowed.', LINK);
      }
    }

    _getWebURL(value) {
      try {
        const url = new URL(value, window.location.href);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
      } catch (error) {
        return null;
      }
    }

    getWidth() {
      return window.innerWidth;
    }

    getHeight() {
      return window.innerHeight;
    }
  }

  Scratch.extensions.register(new BrowserControlExtension());

})(Scratch);
