import JSZip from '@turbowarp/jszip';
import rewriteBundledExtensionURLs from '../../../src/lib/tw-project-extension-rewriter';

const project = {
    extensions: ['dtbyxeroname', 'gdcollision', 'lmsLooksPlus', 'xeltallivclipblend', 'penP'],
    extensionURLs: {
        dtbyxeroname: 'https://extensions.turbowarp.org/XeroName/Deltatime.js',
        gdcollision: 'data:text/javascript;base64,ZXh0ZW5zaW9u',
        lmsLooksPlus: 'https://extensions.turbowarp.org/Lily/LooksPlus.js',
        xeltallivclipblend: 'https://extensions.turbowarp.org/Xeltalliv/clippingblending.js',
        penP: 'https://extensions.turbowarp.org/obviousAlexC/penPlus.js'
    },
    targets: []
};

const origin = 'http://localhost';

describe('rewrite bundled project extension URLs', () => {
    beforeAll(() => {
        global.window = {
            location: {
                origin
            }
        };
    });

    afterAll(() => {
        delete global.window;
    });

    test('rewrites known bundled extensions without changing other extension URLs', async () => {
        const rewritten = await rewriteBundledExtensionURLs(project);

        expect(rewritten.extensionURLs).toEqual({
            dtbyxeroname: `${origin}/static/extensions/Deltatime.js`,
            gdcollision: project.extensionURLs.gdcollision,
            lmsLooksPlus: `${origin}/static/extensions/LooksPlus.js`,
            xeltallivclipblend: `${origin}/static/extensions/upstream/Xeltalliv/clippingblending.js`,
            penP: `${origin}/static/extensions/upstream/obviousAlexC/penPlus.js`
        });
        expect(project.extensionURLs.dtbyxeroname).toBe(
            'https://extensions.turbowarp.org/XeroName/Deltatime.js'
        );
    });

    test('rewrites projects inside SB3 archives', async () => {
        const zip = new JSZip();
        zip.file('project.json', JSON.stringify(project));
        zip.file('asset.txt', 'preserved');
        const archive = await zip.generateAsync({type: 'uint8array'});

        const rewrittenArchive = await rewriteBundledExtensionURLs(archive);
        const rewrittenZip = await JSZip.loadAsync(rewrittenArchive);
        const rewrittenProject = JSON.parse(await rewrittenZip.file('project.json').async('string'));

        expect(rewrittenProject.extensionURLs.dtbyxeroname).toBe(
            `${origin}/static/extensions/Deltatime.js`
        );
        expect(await rewrittenZip.file('asset.txt').async('string')).toBe('preserved');
    });

    test('leaves projects without known bundled extension URLs unchanged', async () => {
        const otherURL = {
            extensions: ['custom'],
            extensionURLs: {
                custom: 'https://example.com/extension.js'
            }
        };

        await expect(rewriteBundledExtensionURLs(otherURL)).resolves.toBe(otherURL);
        await expect(rewriteBundledExtensionURLs('100')).resolves.toBe('100');
    });
});
