import fs from 'node:fs';
import vm from 'node:vm';
import JSZip from '@turbowarp/jszip';

const archivePath = process.argv[2];
if (!archivePath) {
    console.error('Usage: npm run diagnose:extensions -- "path/to/project.sb3"');
    process.exit(2);
}

const decodeJavaScriptDataURL = url => {
    if (!url.startsWith('data:text/javascript')) return null;
    const comma = url.indexOf(',');
    if (comma === -1) throw new Error('Invalid data JavaScript URL: no comma');
    const metadata = url.slice(0, comma);
    const payload = url.slice(comma + 1);
    if (metadata.endsWith(';base64')) {
        return Buffer.from(payload, 'base64').toString('utf8');
    }
    return decodeURIComponent(payload);
};

const zip = await JSZip.loadAsync(fs.readFileSync(archivePath));
const projectFile = zip.file('project.json');
if (!projectFile) throw new Error('SB3 does not contain project.json');
const project = JSON.parse(await projectFile.async('string'));
const extensionURLs = project.extensionURLs || {};

console.log(`Project: ${archivePath}`);
console.log(`Extensions: ${(project.extensions || []).join(', ') || '(none)'}`);

for (const extensionID of project.extensions || []) {
    const url = extensionURLs[extensionID];
    if (!url) {
        console.log(`- ${extensionID}: has no project extension URL`);
        continue;
    }

    let source;
    try {
        source = decodeJavaScriptDataURL(url);
    } catch (error) {
        console.log(`- ${extensionID}: URL decode failed: ${error.message}`);
        continue;
    }

    if (source === null) {
        console.log(`- ${extensionID}: URL is not embeddable data code (${url.slice(0, 80)})`);
        continue;
    }

    let registeredExtension = null;
    const Scratch = {
        ArgumentType: {STRING: 'string', NUMBER: 'number', BOOLEAN: 'boolean'},
        BlockType: {
            COMMAND: 'command',
            REPORTER: 'reporter',
            BOOLEAN: 'boolean',
            HAT: 'hat'
        },
        extensions: {
            unsandboxed: true,
            register: extension => {
                registeredExtension = extension;
            }
        },
        vm: {},
        renderer: {}
    };

    try {
        vm.runInNewContext(source, {Scratch, console, setTimeout, clearTimeout}, {
            filename: `${extensionID}.js`,
            timeout: 3000
        });
        if (!registeredExtension) {
            console.log(`- ${extensionID}: SCRIPT RAN but did not call Scratch.extensions.register()`);
            continue;
        }
        const info = registeredExtension.getInfo();
        console.log(`- ${extensionID}: OK, registered as ${info.id}, blocks=${info.blocks?.length || 0}`);
    } catch (error) {
        console.log(`- ${extensionID}: SCRIPT THREW: ${error.name}: ${error.message}`);
    }
}
