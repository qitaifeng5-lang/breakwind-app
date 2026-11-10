import {chromium,devices,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const [mode,sha]=process.argv.slice(2),base='https://qitaifeng5-lang.github.io/breakwind-app/';
if(!['seed','verify'].includes(mode)||!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Expected seed|verify and full SHA');
const root=new URL('../.expo/cache-upgrade/',import.meta.url);await mkdir(root,{recursive:true});
const context=await chromium.launchPersistentContext(fileURLToPath(new URL('profile/',root)),{...devices['iPhone 13'],channel:process.env.BREAKWIND_TEST_BROWSER||undefined,headless:true});
try{
 const page=context.pages()[0]||await context.newPage();await page.goto(base+'#run');
 await expect(page.locator('meta[name=breakwind-preview]')).toHaveAttribute('content',sha);
 await page.evaluate(async()=>{await(await navigator.serviceWorker.ready).update();});
 await expect.poll(()=>page.evaluate(async()=>(await caches.keys()).filter(k=>k.startsWith('breakwind-preview-'))),{timeout:30000}).toEqual(['breakwind-preview-'+sha]);
 if(mode==='seed'){
  await page.evaluate(()=>localStorage.setItem('breakwind-upgrade-sentinel','keep-local-data'));
  await writeFile(new URL('seed.json',root),JSON.stringify({sha,base,installed:true}));
 }else{
  const before=JSON.parse(await readFile(new URL('seed.json',root),'utf8'));expect(before.sha).not.toBe(sha);
  const modules=[];page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('.js')&&!r.url().includes('/sw.js'))modules.push(r.url());});
  await page.reload();await expect(page.locator('meta[name=breakwind-preview]')).toHaveAttribute('content',sha);
  expect(await page.evaluate(()=>localStorage.getItem('breakwind-upgrade-sentinel'))).toBe('keep-local-data');
  expect(modules.length).toBeGreaterThan(5);expect(modules.every(url=>new URL(url).searchParams.get('v')===sha)).toBe(true);
  await writeFile(new URL('result.json',root),JSON.stringify({from:before.sha,to:sha,base,oldCacheRemoved:true,localStoragePreserved:true,modules},null,2));
 }
 console.log(JSON.stringify({mode,sha,base,passed:true}));
}finally{await context.close();}
