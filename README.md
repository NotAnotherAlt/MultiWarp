# TurboWarp Unblocked

## Build

```sh
npm install
npm run prepublish
npm run build
```

## Local Preview

After installing dependencies, start the development server:

```sh
npm start
```

Open `http://localhost:8601/editor.html` to try the editor, or
`http://localhost:8601/embed.html` to preview the embedded player. You can open a
test project in the editor to check changes before deploying. Stop the server with
Ctrl+C when you're done. In GitHub Codespaces or another remote environment, open
port `8601` from the forwarded ports panel if localhost is not accessible directly.

Use **See project** and **See inside** to switch between the running project and
editor without reloading the currently open document. The view transition is
animated, and the Blockly workspace is removed while the project-only view is
shown; the project continues running in the VM. The development build still
provides separate `index.html` and `editor.html` entry points for direct links.

## Local Extensions

Put extension JavaScript files in the root `extensions/` directory. Add each one to
`extensions/generated-metadata/extensions-v0.json` using its extension ID, filename
without `.js` as the slug, display name, description, and `"scratchCompatible": false`.
Optionally add an `image` path, such as `"image": "images/delta-time.png"`, and put that
image under `extensions/images/`. The build copies these files to `/static/extensions/`
and loads them in the extension gallery. Bundled extensions run unsandboxed, so only
add code you trust.

To bulk import the extensions currently listed by TurboWarp, run:

```sh
npm run extensions:import
```

The importer downloads the production JavaScript and matching images, saves them under
`extensions/upstream/` and `extensions/images/upstream/`, and refreshes their catalog
entries without replacing local extensions. Use `npm run extensions:import -- --dry-run`
to check the import without writing files. Imported extensions run unsandboxed; review
the code before deploying.

## Deploy to Netlify

Log in and link this checkout to the Netlify site once:

```sh
npx netlify login
npx netlify link
```

Build locally, then deploy the completed build directory to production:

```sh
npm run prepublish
npm run build
npx netlify deploy --prod --dir=build --no-build
```


## Custom Changes

The local MultiWarp customizations include:

- Custom images for the `steamworks` and `numerical-encoding V1` extensions.
- An animated, same-document transition between the editor and project-only view;
  the current view is retained in browser history.
- The Blockly workspace is culled in project-only mode while scripts continue to
  run. Reopening the editor restores the block workspace.
- Cat Blocks refreshes the main workspace and toolbox flyout when toggled, so cat
  decorations disappear from the code sidebar when disabled.
