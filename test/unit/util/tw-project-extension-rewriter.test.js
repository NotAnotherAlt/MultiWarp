import fs from 'node:fs';
import path from 'node:path';
import JSZip from '@turbowarp/jszip';
import rewriteBundledExtensionURLs from '../../../src/lib/tw-project-extension-rewriter';

const project = {
    extensions: ['dtbyxeroname', 'lmsLooksPlus', 'xeltallivclipblend', 'penP'],
    extensionURLs: {
        dtbyxeroname: 'https://extensions.turbowarp.org/XeroName/Deltatime.js',
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
            lmsLooksPlus: `${origin}/static/extensions/LooksPlus.js`,
            xeltallivclipblend: `${origin}/static/extensions/upstream/Xeltalliv/clippingblending.js`,
            penP: `${origin}/static/extensions/upstream/obviousAlexC/penPlus.js`
        });
        expect(project.extensionURLs.dtbyxeroname).toBe(
            'https://extensions.turbowarp.org/XeroName/Deltatime.js'
        );
    });

    test('rewrites a catalog extension from its upstream URL to the hosted bundled copy', async () => {
        const originalFetch = global.fetch;
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                extensions: [{
                    id: 'lbdrawtest',
                    slug: 'upstream/Longboost/color_channels'
                }]
            })
        }));
        const colorChannelsProject = {
            extensions: ['lbdrawtest'],
            extensionURLs: {
                lbdrawtest: 'https://extensions.turbowarp.org/Longboost/color_channels.js'
            }
        };

        try {
            const rewritten = await rewriteBundledExtensionURLs(colorChannelsProject);
            expect(rewritten.extensionURLs.lbdrawtest).toBe(
                `${origin}/static/extensions/upstream/Longboost/color_channels.js`
            );
        } finally {
            global.fetch = originalFetch;
        }
    });

    test('rewrites a catalog extension from its upstream URL to the offline bundled copy', async () => {
        global.window.__MULTIWARP_OFFLINE__ = {
            extensionMetadata: {
                extensions: [{
                    id: 'lbdrawtest',
                    slug: 'upstream/Longboost/color_channels'
                }]
            },
            extensionURLsByPath: {
                'upstream/Longboost/color_channels.js':
                    'https://multiwarp-offline.invalid/static/extensions/upstream/Longboost/color_channels.js'
            }
        };
        const colorChannelsProject = {
            extensions: ['lbdrawtest'],
            extensionURLs: {
                lbdrawtest: 'https://extensions.turbowarp.org/Longboost/color_channels.js'
            }
        };

        try {
            const rewritten = await rewriteBundledExtensionURLs(colorChannelsProject);
            expect(rewritten.extensionURLs.lbdrawtest).toBe(
                'https://multiwarp-offline.invalid/static/extensions/upstream/Longboost/color_channels.js'
            );
        } finally {
            delete global.window.__MULTIWARP_OFFLINE__;
        }
    });

    test('rewrites bundled extensions to embedded virtual HTTPS URLs in offline mode', async () => {
        global.window.__MULTIWARP_OFFLINE__ = {
            extensionURLsByPath: {
                'Deltatime.js': 'https://multiwarp-offline.invalid/static/extensions/Deltatime.js',
                'LooksPlus.js': 'https://multiwarp-offline.invalid/static/extensions/LooksPlus.js',
                'upstream/Xeltalliv/clippingblending.js':
                    'https://multiwarp-offline.invalid/static/extensions/upstream/Xeltalliv/clippingblending.js',
                'upstream/obviousAlexC/penPlus.js':
                    'https://multiwarp-offline.invalid/static/extensions/upstream/obviousAlexC/penPlus.js'
            }
        };

        try {
            const rewritten = await rewriteBundledExtensionURLs(project);
            expect(rewritten.extensionURLs).toEqual({
                dtbyxeroname: 'https://multiwarp-offline.invalid/static/extensions/Deltatime.js',
                lmsLooksPlus: 'https://multiwarp-offline.invalid/static/extensions/LooksPlus.js',
                xeltallivclipblend:
                    'https://multiwarp-offline.invalid/static/extensions/upstream/Xeltalliv/clippingblending.js',
                penP: 'https://multiwarp-offline.invalid/static/extensions/upstream/obviousAlexC/penPlus.js'
            });
        } finally {
            delete global.window.__MULTIWARP_OFFLINE__;
        }
    });

    test('rewrites stale file project extension URLs to bundled offline extensions', async () => {
        global.window.__MULTIWARP_OFFLINE__ = {
            extensionURLsByPath: {
                'LooksPlus.js': 'file:///multiwarp-offline/static/extensions/LooksPlus.js'
            }
        };
        const localProject = {
            extensions: ['lmsLooksPlus'],
            extensionURLs: {
                lmsLooksPlus: 'file:///tmp-old/static/extensions/LooksPlus.js'
            }
        };

        try {
            const rewritten = await rewriteBundledExtensionURLs(localProject);
            expect(rewritten.extensionURLs.lmsLooksPlus).toBe(
                'file:///multiwarp-offline/static/extensions/LooksPlus.js'
            );
        } finally {
            delete global.window.__MULTIWARP_OFFLINE__;
        }
    });

    test('rewrites saved offline virtual URLs to hosted bundled extensions', async () => {
        const localProject = {
            extensions: ['lmsLooksPlus'],
            extensionURLs: {
                lmsLooksPlus: 'file:///multiwarp-offline/static/extensions/LooksPlus.js'
            }
        };

        const rewritten = await rewriteBundledExtensionURLs(localProject);
        expect(rewritten.extensionURLs.lmsLooksPlus).toBe(
            `${origin}/static/extensions/LooksPlus.js`
        );
    });

    test('leaves custom extension metadata unchanged', async () => {
        const customProject = {
            extensions: ['lmsLooksPlus', 'customExtension'],
            extensionURLs: {
                lmsLooksPlus: 'https://extensions.turbowarp.org/Lily/LooksPlus.js',
                customExtension: 'data:text/javascript;base64,Y3VzdG9t'
            },
            targets: []
        };

        const rewritten = await rewriteBundledExtensionURLs(customProject);
        expect(rewritten.extensions).toContain('customExtension');
        expect(rewritten.extensionURLs.customExtension).toBe(
            'data:text/javascript;base64,Y3VzdG9t'
        );
        expect(rewritten.extensionURLs.lmsLooksPlus).toBe(
            `${origin}/static/extensions/LooksPlus.js`
        );
    });

    test('does not rewrite custom third-party extension URLs that only share a bundled filename', async () => {
        const customProject = {
            extensions: ['lmsLooksPlus'],
            extensionURLs: {
                lmsLooksPlus: 'https://example.com/static/extensions/LooksPlus.js'
            }
        };

        const rewritten = await rewriteBundledExtensionURLs(customProject);
        expect(rewritten).toBe(customProject);
        expect(rewritten.extensionURLs.lmsLooksPlus).toBe('https://example.com/static/extensions/LooksPlus.js');
    });

    test('does not rewrite a custom URL under another path on the app origin', async () => {
        const customURL = `${origin}/another-project/static/extensions/LooksPlus.js`;
        const customProject = {
            extensions: ['lmsLooksPlus'],
            extensionURLs: {
                lmsLooksPlus: customURL
            }
        };

        const rewritten = await rewriteBundledExtensionURLs(customProject);
        expect(rewritten).toBe(customProject);
        expect(rewritten.extensionURLs.lmsLooksPlus).toBe(customURL);
    });

    test('rewrites arbitrary bundled paths from offline virtual URLs', async () => {
        const localProject = {
            extensions: ['customBundledExtension'],
            extensionURLs: {
                customBundledExtension:
                    'file:///multiwarp-offline/static/extensions/upstream/author/custom.js'
            }
        };

        const rewritten = await rewriteBundledExtensionURLs(localProject);
        expect(rewritten.extensionURLs.customBundledExtension).toBe(
            `${origin}/static/extensions/upstream/author/custom.js`
        );
    });

    test('rewrites hosted project extension URLs to bundled offline extensions', async () => {
        global.window.__MULTIWARP_OFFLINE__ = {
            extensionURLsByPath: {
                'LooksPlus.js': 'file:///multiwarp-offline/static/extensions/LooksPlus.js'
            }
        };
        const hostedProject = {
            extensions: ['lmsLooksPlus'],
            extensionURLs: {
                lmsLooksPlus: 'https://example.app/static/extensions/LooksPlus.js'
            }
        };

        try {
            const rewritten = await rewriteBundledExtensionURLs(hostedProject);
            expect(rewritten.extensionURLs.lmsLooksPlus).toBe(
                'file:///multiwarp-offline/static/extensions/LooksPlus.js'
            );
        } finally {
            delete global.window.__MULTIWARP_OFFLINE__;
        }
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

    test('rewrites the real JGD a0.2 SB3 archive without removing custom extensions', async () => {
        const archivePath = path.resolve(process.cwd(), 'JGD a0.2.sb3');
        if (!fs.existsSync(archivePath)) return;

        const archive = new Uint8Array(fs.readFileSync(archivePath));
        const originalZip = await JSZip.loadAsync(archive);
        const originalProject = JSON.parse(await originalZip.file('project.json').async('string'));
        const rewrittenArchive = await rewriteBundledExtensionURLs(archive);
        const rewrittenZip = await JSZip.loadAsync(rewrittenArchive);
        const rewrittenProject = JSON.parse(await rewrittenZip.file('project.json').async('string'));

        expect(rewrittenProject.extensions).toContain('gdcollision');
        expect(rewrittenProject.extensionURLs).toHaveProperty('gdcollision');
        expect(rewrittenProject.extensionURLs.gdcollision).toBe(originalProject.extensionURLs.gdcollision);
        expect(rewrittenProject.extensionURLs.dtbyxeroname).toBe(
            `${origin}/static/extensions/Deltatime.js`
        );
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
