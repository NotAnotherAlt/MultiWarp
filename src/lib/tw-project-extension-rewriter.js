import JSZip from '@turbowarp/jszip';

const getBundledExtensionsBaseURL = () => {
    if (window.__MULTIWARP_OFFLINE__) {
        return 'offline-bundle://static/extensions/';
    }
    return new URL(
        `${process.env.ROOT || ''}static/extensions/`,
        window.location.origin
    ).href;
};

const knownExtensions = {
    dtbyxeroname: {
        url: 'https://extensions.turbowarp.org/XeroName/Deltatime.js',
        path: 'Deltatime.js'
    },
    lmsLooksPlus: {
        url: 'https://extensions.turbowarp.org/Lily/LooksPlus.js',
        path: 'LooksPlus.js'
    },
    xeltallivclipblend: {
        url: 'https://extensions.turbowarp.org/Xeltalliv/clippingblending.js',
        path: 'upstream/Xeltalliv/clippingblending.js'
    },
    penP: {
        url: 'https://extensions.turbowarp.org/obviousAlexC/penPlus.js',
        path: 'upstream/obviousAlexC/penPlus.js'
    }
};

let extensionMetadataPromise;

const getExtensionMetadata = () => {
    const offlineBundle = window.__MULTIWARP_OFFLINE__;
    if (offlineBundle) return Promise.resolve(offlineBundle.extensionMetadata);
    if (!extensionMetadataPromise) {
        const metadataURL = new URL(
            `${process.env.ROOT || ''}static/extensions/generated-metadata/extensions-v0.json`,
            window.location.origin
        );
        extensionMetadataPromise = fetch(metadataURL.href).then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load bundled extension metadata: HTTP ${response.status}`);
            }
            return response.json();
        });
    }
    return extensionMetadataPromise;
};

const isTurboWarpExtensionURL = url => {
    try {
        return new URL(url).origin === 'https://extensions.turbowarp.org';
    } catch (e) {
        return false;
    }
};

const getURLPathInfo = url => {
    if (typeof url !== 'string') return null;
    try {
        const parsedURL = new URL(url, window.location.href);
        const marker = '/static/extensions/';
        const markerIndex = parsedURL.pathname.lastIndexOf(marker);
        if (markerIndex === -1) return null;
        const extensionPath = decodeURIComponent(parsedURL.pathname.slice(markerIndex + marker.length));
        if (!extensionPath) return null;
        return {
            parsedURL,
            extensionPath
        };
    } catch (e) {
        return null;
    }
};

const isTrustedBundledExtensionOrigin = parsedURL => {
    if (!parsedURL) return false;
    const bundledExtensionsBaseURL = new URL(
        `${process.env.ROOT || ''}static/extensions/`,
        window.location.origin
    );
    return (
        (
            parsedURL.origin === bundledExtensionsBaseURL.origin &&
            parsedURL.pathname.startsWith(bundledExtensionsBaseURL.pathname)
        ) ||
        parsedURL.origin === 'https://extensions.turbowarp.org' ||
        parsedURL.protocol === 'file:' ||
        parsedURL.hostname === 'multiwarp-offline.invalid'
    );
};

const matchesKnownExtensionURL = (extension, url) => {
    const info = getURLPathInfo(url);
    if (!info) return false;
    const {parsedURL, extensionPath} = info;
    if (!isTrustedBundledExtensionOrigin(parsedURL)) return false;
    return extensionPath === extension.path;
};

const getBundledExtensionURL = url => {
    if (window.__MULTIWARP_OFFLINE__) return null;
    const info = getURLPathInfo(url);
    if (!info) return null;
    const {parsedURL, extensionPath} = info;
    if (!isTrustedBundledExtensionOrigin(parsedURL)) return null;
    const bundledExtensionsBaseURL = getBundledExtensionsBaseURL();
    return `${bundledExtensionsBaseURL}${extensionPath}`;
};

const getMetadataExtension = (extensionMetadata, extensionId, url) => {
    if (!extensionMetadata || !Array.isArray(extensionMetadata.extensions)) return null;
    const extension = extensionMetadata.extensions.find(item => item.id === extensionId);
    if (!extension || typeof extension.slug !== 'string') return null;
    let parsedURL;
    try {
        parsedURL = new URL(url);
    } catch (e) {
        return null;
    }
    if (parsedURL.origin !== 'https://extensions.turbowarp.org') return null;
    const extensionPaths = [extension.slug];
    if (extension.slug.startsWith('upstream/')) {
        extensionPaths.push(extension.slug.slice('upstream/'.length));
    }
    return extensionPaths.some(extensionPath => (
        parsedURL.pathname === `/${extensionPath.split('/').map(encodeURIComponent)
            .join('/')}.js`
    )) ? extension : null;
};

const getOfflineExtensionURL = url => {
    const offlineBundle = window.__MULTIWARP_OFFLINE__;
    if (!offlineBundle) return null;
    try {
        const parsedURL = new URL(url, window.location.href);
        const marker = '/static/extensions/';
        const markerIndex = parsedURL.pathname.lastIndexOf(marker);
        if (markerIndex !== -1) {
            const extensionPath = decodeURIComponent(parsedURL.pathname.slice(markerIndex + marker.length));
            const exactURL = offlineBundle.extensionURLsByPath[extensionPath];
            if (exactURL) return exactURL;
        }

        return null;
    } catch (e) {
        return null;
    }
};

const rewriteProjectJSON = (project, extensionMetadata) => {
    if (
        !project ||
        typeof project !== 'object'
    ) {
        return null;
    }

    const rewrittenProject = null;
    const projectToRewrite = rewrittenProject || project;
    if (!Array.isArray(projectToRewrite.extensions) || !projectToRewrite.extensionURLs ||
        typeof projectToRewrite.extensionURLs !== 'object') {
        return rewrittenProject;
    }

    let rewrittenURLs = null;
    let bundledExtensionsBaseURL = null;
    for (const extensionId of projectToRewrite.extensions) {
        const extensionURLInProject = projectToRewrite.extensionURLs[extensionId];
        const knownExtension = knownExtensions[extensionId];
        const extension = knownExtension &&
            (extensionURLInProject === knownExtension.url ||
                matchesKnownExtensionURL(knownExtension, extensionURLInProject)) ?
            knownExtension :
            getMetadataExtension(extensionMetadata, extensionId, extensionURLInProject);
        let extensionURL = null;
        if (extension) {
            const extensionPath = extension.path || `${extension.slug}.js`;
            if (window.__MULTIWARP_OFFLINE__) {
                extensionURL = window.__MULTIWARP_OFFLINE__.extensionURLsByPath[extensionPath];
            } else {
                bundledExtensionsBaseURL = bundledExtensionsBaseURL || getBundledExtensionsBaseURL();
                extensionURL = `${bundledExtensionsBaseURL}${extensionPath}`;
            }
        } else {
            extensionURL = getOfflineExtensionURL(project.extensionURLs[extensionId]) ||
                getBundledExtensionURL(project.extensionURLs[extensionId]);
        }
        if (extensionURL && extensionURL !== project.extensionURLs[extensionId]) {
            if (!rewrittenURLs) rewrittenURLs = {...projectToRewrite.extensionURLs};
            rewrittenURLs[extensionId] = extensionURL;
        }
    }

    if (!rewrittenURLs && !rewrittenProject) return null;
    return {
        ...(rewrittenProject || project),
        extensionURLs: rewrittenURLs || (rewrittenProject ? rewrittenProject.extensionURLs : project.extensionURLs)
    };
};

const getZipBytes = data => {
    if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    }
    if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    return null;
};

const isZip = bytes => bytes && bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;

/**
 * Redirect known bundled extensions in projects to this build's local copies.
 * @param {*} projectData Project JSON or an SB3 archive
 * @returns {Promise<*>} Project data with matching extension URLs rewritten
 */
const rewriteBundledExtensionURLs = async projectData => {
    const projectMetadata = projectData && Array.isArray(projectData.extensions) &&
        projectData.extensions.some(extensionId => (
            !knownExtensions[extensionId] &&
            isTurboWarpExtensionURL(projectData.extensionURLs && projectData.extensionURLs[extensionId])
        )) ? await getExtensionMetadata() : null;
    const project = rewriteProjectJSON(projectData, projectMetadata);
    if (project) {
        return project;
    }

    const bytes = getZipBytes(projectData);
    if (!isZip(bytes)) {
        return projectData;
    }

    const zip = await JSZip.loadAsync(bytes);
    const projectFile = zip.file('project.json');
    if (!projectFile) {
        return projectData;
    }

    const projectJSON = JSON.parse(await projectFile.async('string'));
    const archiveMetadata = Array.isArray(projectJSON.extensions) &&
        projectJSON.extensions.some(extensionId => (
            !knownExtensions[extensionId] &&
            isTurboWarpExtensionURL(projectJSON.extensionURLs && projectJSON.extensionURLs[extensionId])
        )) ? await getExtensionMetadata() : null;
    const rewrittenProject = rewriteProjectJSON(projectJSON, archiveMetadata);
    if (!rewrittenProject) {
        return projectData;
    }

    zip.file('project.json', JSON.stringify(rewrittenProject));
    return zip.generateAsync({type: 'uint8array'});
};

export default rewriteBundledExtensionURLs;
