import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const target=new URL('../.expo/pages-preview/',import.meta.url);
const source=new URL('../public/',import.meta.url);
export const assets=[
  'index.html','app.js','styles.css','model.js','engine.js','knowledge.js','running.js','fuel.js',
  'hero.jpg','icon.svg','icon-192.png','icon-512.png','manifest.webmanifest','sw.js'
];
const revision=process.env.GITHUB_SHA || 'local';
if (!/^(local|[0-9a-f]{40})$/.test(revision)) throw new Error('Invalid preview revision');
await mkdir(target,{recursive:true});
const allowed=new Set([...assets,'.nojekyll']);
const unexpected=(await readdir(target)).filter(name=>!allowed.has(name));
if (unexpected.length) throw new Error('Preview directory contains files outside the asset allowlist');
for (const name of assets) {
  let content=await readFile(new URL(name,source));
  if (name==='index.html') content=content.toString().replace('<head>',
    '<head>\n  <meta name="breakwind-preview" content="'+revision+'">\n  <meta name="robots" content="noindex,nofollow">\n'+
    '  <meta http-equiv="Content-Security-Policy" content="default-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' blob:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">');
  const versionedAssets=['app.js','styles.css'];
  if (name==='index.html' || name==='sw.js') {
    content=content.toString();
    for (const asset of versionedAssets) content=content.replaceAll(asset,asset+'?v='+revision);
  }
  if (name==='sw.js') content=content.replace(/breakwind-shell-v\d+/, 'breakwind-preview-'+revision);
  await writeFile(new URL(name,target),content);
}
await writeFile(new URL('.nojekyll',target),'');
console.log('Prepared '+assets.length+' allowlisted assets for HTTPS preview');
