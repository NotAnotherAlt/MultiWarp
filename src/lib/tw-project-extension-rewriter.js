import JSZip from '@turbowarp/jszip';

const getBundledExtensionsBaseURL = () => new URL(
    `${process.env.ROOT || ''}static/extensions/`,
    window.location.origin
).href;

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

const rewriteProjectJSON = project => {
    if (
        !project ||
        typeof project !== 'object' ||
        !Array.isArray(project.extensions) ||
        !project.extensionURLs ||
        typeof project.extensionURLs !== 'object'
    ) {
        return null;
    }

    let rewrittenURLs = null;
    let bundledExtensionsBaseURL = null;
    for (const [extensionId, extension] of Object.entries(knownExtensions)) {
        if (
            project.extensions.includes(extensionId) &&
            project.extensionURLs[extensionId] === extension.url
        ) {
            if (!rewrittenURLs) {
                rewrittenURLs = {...project.extensionURLs};
                bundledExtensionsBaseURL = getBundledExtensionsBaseURL();
            }
            rewrittenURLs[extensionId] = `${bundledExtensionsBaseURL}${extension.path}`;
        }
    }

    return rewrittenURLs ? {
        ...project,
        extensionURLs: rewrittenURLs
    } : null;
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
    const project = rewriteProjectJSON(projectData);
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
    const rewrittenProject = rewriteProjectJSON(projectJSON);
    if (!rewrittenProject) {
        return projectData;
    }

    zip.file('project.json', JSON.stringify(rewrittenProject));
    return zip.generateAsync({type: 'uint8array'});
};

export default rewriteBundledExtensionURLs;
