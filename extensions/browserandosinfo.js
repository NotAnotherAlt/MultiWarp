// Browser & OS Info
// Created by @redspacecat

(function () {
    const root = Function('return this')();
    const Scratch = root.Scratch;

    class BrowserAndOSInfo {
        getInfo () {
            return {
                id: 'browserinfo',
                name: 'Browser & OS Info',
                color1: '#449462',
                color2: '#35754d',
                color3: '#35754d',
                blocks: [
                    {
                        opcode: 'getBrowserName',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'get browser name',
                        disableMonitor: true
                    },
                    {
                        opcode: 'getBrowserVersion',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'get browser version',
                        disableMonitor: true
                    },
                    {
                        opcode: 'getOSName',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'get OS name',
                        disableMonitor: true
                    },
                    {
                        opcode: 'getOSVersion',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'get OS version',
                        disableMonitor: true
                    },
                    {
                        opcode: 'getPlatform',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'get platform',
                        disableMonitor: true
                    },
                    {
                        opcode: 'getRenderingEngine',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'get rendering engine',
                        disableMonitor: true
                    }
                ]
            };
        }

        getBrowserInfo () {
            const userAgent = root.navigator.userAgent;
            const browserPatterns = [
                {name: 'Microsoft Edge', pattern: /EdgA?\/([\d.]+)/i},
                {name: 'Opera', pattern: /(?:OPR|Opera)\/([\d.]+)/i},
                {name: 'Samsung Internet', pattern: /SamsungBrowser\/([\d.]+)/i},
                {name: 'Chrome', pattern: /(?:Chrome|CriOS)\/([\d.]+)/i},
                {name: 'Firefox', pattern: /(?:Firefox|FxiOS)\/([\d.]+)/i},
                {name: 'Internet Explorer', pattern: /(?:MSIE |rv:)([\d.]+).*?(?:Trident\/|$)/i},
                {name: 'Safari', pattern: /Version\/([\d.]+).*Safari/i}
            ];
            const browser = browserPatterns.find(item => item.pattern.test(userAgent));
            const browserMatch = browser && userAgent.match(browser.pattern);

            let operatingSystem = 'Unknown';
            let operatingSystemVersion = '';
            const operatingSystemPatterns = [
                {name: 'Windows', pattern: /Windows NT ([\d.]+)/i},
                {name: 'Android', pattern: /Android ([\d.]+)/i},
                {name: 'iOS', pattern: /(?:iPhone OS|CPU OS) ([\d_]+)/i},
                {name: 'macOS', pattern: /Mac OS X ([\d_]+)/i},
                {name: 'Chrome OS', pattern: /CrOS [^ ]+ ([\d.]+)/i}
            ];
            for (const item of operatingSystemPatterns) {
                const match = userAgent.match(item.pattern);
                if (match) {
                    operatingSystem = item.name;
                    operatingSystemVersion = match[1].replace(/_/g, '.');
                    break;
                }
            }
            if (operatingSystem === 'Unknown' && /Linux/i.test(userAgent)) {
                operatingSystem = 'Linux';
            }

            const userAgentData = root.navigator.userAgentData;
            let platform = 'desktop';
            if (userAgentData && userAgentData.mobile) {
                platform = 'mobile';
            } else if (/iPad|Tablet/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) ||
          (/Macintosh/i.test(userAgent) && root.navigator.maxTouchPoints > 1)) {
                platform = 'tablet';
            } else if (/Mobile|iPhone|iPod|Android/i.test(userAgent)) {
                platform = 'mobile';
            }

            let renderingEngine = 'Unknown';
            if (/Trident\//i.test(userAgent)) {
                renderingEngine = 'Trident';
            } else if (/Gecko\//i.test(userAgent) && /Firefox/i.test(userAgent)) {
                renderingEngine = 'Gecko';
            } else if (/AppleWebKit\//i.test(userAgent)) {
                renderingEngine = /Chrome|Chromium|Edg|OPR/i.test(userAgent) ? 'Blink' : 'WebKit';
            }

            return {
                browserName: browser ? browser.name : 'Unknown',
                browserVersion: browserMatch ? browserMatch[1] : '',
                operatingSystem,
                operatingSystemVersion,
                platform,
                renderingEngine
            };
        }

        getBrowserName () {
            return this.getBrowserInfo().browserName;
        }

        getBrowserVersion () {
            return this.getBrowserInfo().browserVersion;
        }

        getOSName () {
            return this.getBrowserInfo().operatingSystem;
        }

        getOSVersion () {
            return this.getBrowserInfo().operatingSystemVersion;
        }

        getPlatform () {
            return this.getBrowserInfo().platform;
        }

        getRenderingEngine () {
            return this.getBrowserInfo().renderingEngine;
        }
    }

    Scratch.extensions.register(new BrowserAndOSInfo());
}());
