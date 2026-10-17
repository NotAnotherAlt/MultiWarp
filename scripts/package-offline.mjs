import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {gzipSync} from 'node:zlib';

const buildDirectory = path.resolve('build');
const editorPath = path.join(buildDirectory, 'editor.html');
const outputPath = path.join(buildDirectory, 'MultiWarp-Offline.html');
const rootOutputPath = path.resolve('MultiWarp-Offline.html');

const walk = directory => fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
});

const getMimeType = filePath => {
    const extension = path.extname(filePath).toLowerCase();
    return ({
        '.css': 'text/css',
        '.gif': 'image/gif',
        '.hex': 'application/octet-stream',
        '.ico': 'image/x-icon',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.webmanifest': 'application/manifest+json',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2'
    })[extension] || 'application/octet-stream';
};

const validateScriptSyntax = (source, filename) => new vm.Script(source, {filename});

if (!fs.existsSync(editorPath)) {
    throw new Error('The editor build is missing. Run `npm run build` first.');
}

const buildFiles = walk(buildDirectory);
const bundledFiles = buildFiles.filter(filePath => (
    (filePath.includes(`${path.sep}js${path.sep}`) && filePath.endsWith('.js')) ||
    filePath.includes(`${path.sep}static${path.sep}`) ||
    filePath.includes(`${path.sep}extension-worker${path.sep}`)
)).filter(filePath => !filePath.endsWith('.map'));

const bundledPaths = new Set(bundledFiles.map(filePath =>
    path.relative(buildDirectory, filePath)
        .split(path.sep)
        .join('/')
));
const extensionsMetadataPath = path.join(
    buildDirectory,
    'static',
    'extensions',
    'generated-metadata',
    'extensions-v0.json'
);
const extensionMetadata = JSON.parse(fs.readFileSync(extensionsMetadataPath, 'utf8'));
const extensionIDs = new Set();
const extensionNames = new Set();
for (const extension of extensionMetadata.extensions) {
    const normalizedName = extension.name.toLowerCase();
    if (extensionIDs.has(extension.id)) {
        throw new Error(`Duplicate extension ID in gallery metadata: ${extension.id}`);
    }
    if (extensionNames.has(normalizedName)) {
        throw new Error(`Duplicate extension name in gallery metadata: ${extension.name}`);
    }
    extensionIDs.add(extension.id);
    extensionNames.add(normalizedName);
    if (!bundledPaths.has(`static/extensions/${extension.slug}.js`)) {
        throw new Error(`Gallery extension script is missing: ${extension.slug}.js`);
    }
    if (extension.image && !bundledPaths.has(`static/extensions/${extension.image}`)) {
        throw new Error(`Gallery extension icon is missing: ${extension.image}`);
    }
}

const entries = [];
const bodies = [];
let bodyLength = 0;
for (const filePath of bundledFiles) {
    const relativePath = path.relative(buildDirectory, filePath)
        .split(path.sep)
        .join('/');
    const contents = fs.readFileSync(filePath);
    if (relativePath.startsWith('js/') && relativePath.endsWith('.js')) {
        const source = contents.toString('utf8').replace(
            /static\/(?:assets|extensions)\/[A-Za-z0-9_./-]+/g,
            assetPath => {
                if (bundledPaths.has(assetPath)) {
                    return `blob:offline-check/${assetPath}`;
                }
                return assetPath;
            }
        );
        validateScriptSyntax(source, relativePath);
    }
    entries.push({
        path: relativePath,
        offset: bodyLength,
        size: contents.length,
        mime: getMimeType(filePath)
    });
    bodies.push(contents);
    bodyLength += contents.length;
}

const archiveHeader = Buffer.from(JSON.stringify(entries));
const archive = Buffer.allocUnsafe(8 + archiveHeader.length + bodyLength);
archive.write('MWOF', 0, 4, 'ascii');
archive.writeUInt32BE(archiveHeader.length, 4);
archiveHeader.copy(archive, 8);
Buffer.concat(bodies, bodyLength).copy(archive, 8 + archiveHeader.length);
const compressedArchive = gzipSync(archive, {level: 9});
const encodedArchive = compressedArchive.toString('base64');

let html = fs.readFileSync(editorPath, 'utf8');
const initialScripts = [];
html = html.replace(/<script\b([^>]*)\bsrc=(["'])([^"']+)\2([^>]*)><\/script>/gi, (tag, _before, _quote, src) => {
    const relativePath = src.replace(/^\.\//, '').replace(/^\//, '');
    if (!relativePath.startsWith('js/') || !relativePath.endsWith('.js')) {
        throw new Error(`Unexpected external script in editor HTML: ${src}`);
    }
    initialScripts.push(relativePath);
    return '';
});

for (const rel of initialScripts) {
    if (!entries.some(entry => entry.path === rel)) {
        throw new Error(`The editor references a script missing from the offline bundle: ${rel}`);
    }
}

html = html.replace(/<link\b[^>]*rel=["']manifest["'][^>]*>\s*/gi, '');
html = html.replace(/<link\b[^>]*rel=["'](?:icon|apple-touch-icon)["'][^>]*>\s*/gi, '');
const faviconPath = path.join(buildDirectory, 'favicon.ico');
if (!fs.existsSync(faviconPath)) {
    throw new Error('The built favicon is missing.');
}
const favicon = fs.readFileSync(faviconPath).toString('base64');
html = html.replace(
    '</head>',
    `<link rel="icon" type="image/x-icon" href="data:image/x-icon;base64,${favicon}"></head>`
);

const bootstrap = `
(() => {
  const encoded = '${encodedArchive}';
  const fail = error => {
    const splash = document.querySelector('.spash-waiting-for-js');
    if (splash) {
      splash.hidden = false;
      splash.innerHTML = '<div><strong>Could not start offline MultiWarp.</strong><pre></pre></div>';
      splash.querySelector('pre').textContent = error && error.stack || String(error);
    } else {
      console.error('Could not start offline MultiWarp', error);
    }
  };
  const normalizePath = value => {
    if (typeof value !== 'string') return '';
    try {
      const parsed = new URL(value, location.href);
      if (parsed.protocol === 'blob:' || parsed.protocol === 'data:') return '';
      return decodeURIComponent(parsed.pathname).replace(/^\\/+/, '');
    } catch (error) {
      return value.split(/[?#]/, 1)[0].replace(/^\\/+/, '');
    }
  };
  const start = async () => {
    if (!('DecompressionStream' in window)) {
      throw new Error('This offline file needs a modern browser with gzip decompression support.');
    }
    const compressed = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const archive = new Uint8Array(await new Response(stream).arrayBuffer());
    if (String.fromCharCode(...archive.subarray(0, 4)) !== 'MWOF') {
      throw new Error('The offline resource archive is invalid.');
    }
    const headerLength = new DataView(archive.buffer, archive.byteOffset, archive.byteLength).getUint32(4);
    const headerEnd = 8 + headerLength;
    const entries = JSON.parse(new TextDecoder().decode(archive.subarray(8, headerEnd)));
    const assetURLs = Object.create(null);
    for (const entry of entries) {
      const contents = archive.subarray(headerEnd + entry.offset, headerEnd + entry.offset + entry.size);
      assetURLs[entry.path] = URL.createObjectURL(new Blob([contents], {type: entry.mime}));
    }

    const paths = Object.keys(assetURLs);
    const resolveAssetURL = value => {
      const normalized = normalizePath(value);
      if (!normalized) return value;
      if (assetURLs[normalized]) return assetURLs[normalized];
      for (const assetPath of paths) {
        if (normalized.endsWith('/' + assetPath)) return assetURLs[assetPath];
      }
      return value;
    };
    const resolvePath = value => {
      const normalized = normalizePath(value);
      if (!normalized) return '';
      if (assetURLs[normalized]) return normalized;
      return paths.find(assetPath => normalized.endsWith('/' + assetPath)) || '';
    };
    const isExternalNetworkURL = value => {
      try {
        const protocol = new URL(value, location.href).protocol;
        return protocol === 'http:' || protocol === 'https:' || protocol === 'ws:' || protocol === 'wss:';
      } catch (error) {
        return false;
      }
    };

    const extensionMetadataPath = 'static/extensions/generated-metadata/extensions-v0.json';
    const extensionMetadata = JSON.parse(await (await fetch(assetURLs[extensionMetadataPath])).text());
    const extensionURLsByPath = Object.create(null);
    const trustedExtensionURLs = new Set();
    const virtualExtensionURL = extensionPath =>
      'file:///multiwarp-offline/static/extensions/' + extensionPath.split('/').map(encodeURIComponent).join('/');
    for (const assetPath of paths) {
      if (assetPath.startsWith('static/extensions/') && assetPath.endsWith('.js')) {
        const extensionPath = assetPath.slice('static/extensions/'.length);
        const extensionURL = virtualExtensionURL(extensionPath);
        extensionURLsByPath[extensionPath] = extensionURL;
        trustedExtensionURLs.add(extensionURL);
      }
    }
    for (const extension of extensionMetadata.extensions) {
      const extensionPath = extension.slug + '.js';
      if (assetURLs['static/extensions/' + extensionPath]) {
        extensionURLsByPath[extensionPath] = virtualExtensionURL(extensionPath);
      }
    }
    window.__MULTIWARP_OFFLINE__ = {
      assetURLs,
      extensionMetadata,
      extensionURLsByPath,
      trustedExtensionURLs
    };

    const nativeFetch = window.fetch.bind(window);
    const nativeOpen = XMLHttpRequest.prototype.open;
    const nativeSetAttribute = Element.prototype.setAttribute;
    const nativeSetProperty = CSSStyleDeclaration.prototype.setProperty;

    const scriptURLs = Object.create(null);
    for (const assetPath of paths) {
      if (
        assetPath.endsWith('.js') &&
        !assetPath.startsWith('static/extensions/')
      ) {
        const source = await (await fetch(assetURLs[assetPath])).text();
        const rewrittenSource = source
          .replace(/static\\/(?:assets|extensions)\\/[A-Za-z0-9_./-]+/g, path => assetURLs[path] || path);
        scriptURLs[assetPath] = URL.createObjectURL(
          new Blob([rewrittenSource], {type: 'text/javascript'})
        );
      }
    }
    const originalResolveAssetURL = resolveAssetURL;
    const resolveScriptOrAssetURL = value => {
      const assetPath = resolvePath(value);
      if (scriptURLs[assetPath]) return scriptURLs[assetPath];
      return originalResolveAssetURL(value);
    };
    const resolveOfflineResourceURL = value => {
      const resolved = resolveScriptOrAssetURL(String(value));
      return isExternalNetworkURL(resolved) ? null : resolved;
    };
    const warnBlockedExternalResource = value => {
      console.warn('External resource blocked by offline MultiWarp:', value);
    };
    window.fetch = (input, init) => {
      const value = input instanceof Request ? input.url : String(input);
      if (isExternalNetworkURL(value)) {
        return Promise.reject(new TypeError('External network access is disabled in the offline build.'));
      }
      return nativeFetch(resolveScriptOrAssetURL(value), init);
    };
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      if (isExternalNetworkURL(String(url))) {
        throw new DOMException('External network access is disabled in the offline build.', 'NetworkError');
      }
      return nativeOpen.call(this, method, resolveScriptOrAssetURL(String(url)), ...args);
    };
    const nativeWindowOpen = window.open.bind(window);
    window.open = (url, ...args) => {
      const resolved = resolveOfflineResourceURL(url);
      if (!resolved) {
        warnBlockedExternalResource(url);
        return null;
      }
      return nativeWindowOpen(resolved, ...args);
    };
    document.addEventListener('click', event => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href]');
      if (link && !resolveOfflineResourceURL(link.href)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        warnBlockedExternalResource(link.href);
      }
    }, true);
    for (const networkConstructor of ['WebSocket', 'EventSource']) {
      if (networkConstructor in window) {
        const NativeConstructor = window[networkConstructor];
        window[networkConstructor] = new Proxy(NativeConstructor, {
          construct(target, args) {
            if (isExternalNetworkURL(String(args[0]))) {
              throw new DOMException('External network access is disabled in the offline build.', 'NetworkError');
            }
            return Reflect.construct(target, args, target);
          }
        });
      }
    }
    Element.prototype.setAttribute = function (name, value) {
      if (/^src$/i.test(name) || (/^(?:xlink:)?href$/i.test(name) && this.tagName !== 'A' && this.tagName !== 'AREA')) {
        const resolved = resolveOfflineResourceURL(value);
        if (!resolved) {
          warnBlockedExternalResource(value);
          return;
        }
        value = resolved;
      }
      return nativeSetAttribute.call(
        this,
        name,
        value
      );
    };
    const overrideResourceProperty = (prototype, property) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
      if (!descriptor || !descriptor.set) return;
      Object.defineProperty(prototype, property, {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set(value) {
          const resolved = resolveOfflineResourceURL(value);
          if (!resolved) {
            warnBlockedExternalResource(value);
            return;
          }
          descriptor.set.call(this, resolved);
        }
      });
    };
    overrideResourceProperty(HTMLScriptElement.prototype, 'src');
    overrideResourceProperty(HTMLImageElement.prototype, 'src');
    overrideResourceProperty(HTMLIFrameElement.prototype, 'src');
    overrideResourceProperty(HTMLLinkElement.prototype, 'href');
    const nativeSetAttributeNS = Element.prototype.setAttributeNS;
    Element.prototype.setAttributeNS = function (namespace, name, value) {
      if (/(^|:)src$/i.test(name) || (/(^|:)href$/i.test(name) && this.tagName !== 'A' && this.tagName !== 'AREA')) {
        const resolved = resolveOfflineResourceURL(value);
        if (!resolved) {
          warnBlockedExternalResource(value);
          return;
        }
        value = resolved;
      }
      return nativeSetAttributeNS.call(this, namespace, name, value);
    };
    CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
      const rewrittenValue = String(value).replace(/url\\((['"]?)([^)'"]+)\\1\\)/g, (match, _quote, url) => {
        const resolved = resolveOfflineResourceURL(url);
        return resolved === null ? 'url("data:,")' : 'url("' + resolved + '")';
      });
      return nativeSetProperty.call(this, name, rewrittenValue, priority);
    };
    if ('Worker' in window) {
      const NativeWorker = window.Worker;
      window.Worker = class OfflineWorker extends NativeWorker {
        constructor (url, options) {
          super(resolveScriptOrAssetURL(String(url)), options);
        }
      };
    }

    const initialScripts = ${JSON.stringify(initialScripts)};
    for (const scriptPath of initialScripts) {
      const script = document.createElement('script');
      script.src = scriptURLs[scriptPath] || assetURLs[scriptPath];
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load bundled script: ' + scriptPath));
        document.body.appendChild(script);
      });
    }
    archive.fill(0);
  };
  start().catch(fail);
})();
`;

if (!html.includes('<div id="app"></div>')) {
    throw new Error('The editor HTML does not contain its application mount point.');
}
validateScriptSyntax(bootstrap, 'offline-bootstrap.js');
html = html.replace('</body>', `<script>${bootstrap}</script></body>`);
fs.writeFileSync(outputPath, html);
fs.writeFileSync(rootOutputPath, html);

console.log(`Created ${path.relative(process.cwd(), outputPath)}`);
console.log(`Created ${path.relative(process.cwd(), rootOutputPath)}`);
console.log(`Embedded ${entries.length} files (${(bodyLength / 1024 / 1024).toFixed(1)} MiB before compression).`);
console.log(`Offline HTML size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(1)} MiB.`);
