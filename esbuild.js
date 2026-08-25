const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

function copyMediaAssets() {
  const mediaSrc = path.join(__dirname, 'src', 'webview', 'media');
  const mediaDist = path.join(__dirname, 'dist', 'media');

  if (!fs.existsSync(mediaDist)) {
    fs.mkdirSync(mediaDist, { recursive: true });
  }

  // Copy Cytoscape JS from node_modules if present
  const cytoscapeSrc = path.join(__dirname, 'node_modules', 'cytoscape', 'dist', 'cytoscape.min.js');
  if (fs.existsSync(cytoscapeSrc)) {
    fs.copyFileSync(cytoscapeSrc, path.join(mediaDist, 'cytoscape.min.js'));
  }

  // Copy all webview media assets
  if (fs.existsSync(mediaSrc)) {
    const files = fs.readdirSync(mediaSrc);
    for (const file of files) {
      fs.copyFileSync(path.join(mediaSrc, file), path.join(mediaDist, file));
    }
  }
}

async function main() {
  copyMediaAssets();

  const extensionCtx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: isProduction,
    sourcemap: !isProduction,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'info',
  });

  if (isWatch) {
    await extensionCtx.watch();
    console.log('Watching for changes...');
  } else {
    await extensionCtx.rebuild();
    await extensionCtx.dispose();
    console.log('Build completed successfully.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
