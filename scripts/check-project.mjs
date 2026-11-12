import { access, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const mode=process.argv[2];
const paths=['public/week-plan.js','native/launch-storage.js','native/launch-legacy.js','scripts/export-native-web.mjs','plugins/with-launch-scope.cjs','public/completion.js','public/workout-detail.js','public/page-host.js','public/training-workbench.js','public/training-structure.js','public/app.js','public/design-lab.js','public/model.js','public/engine.js','public/pb-library.js','public/workout.js','public/workout-ui.js','public/program.js','public/program-ui.js','public/membership.js','public/coach-plan.js','public/coach-ui.js','public/fuel.js','public/running.js','public/sw.js','server.mjs','vision.mjs','app.config.js','native/index.js','native/location.js','native/run-store.js','native/healthkit.js','native/health-data.js','native/session.js','scripts/daily-quality.mjs'];
if (mode==='syntax') {
  for (const path of paths) execFileSync(process.execPath,['--check',path],{stdio:'inherit'});
  // The same JSX parser used by ESLint checks the React Native screen.
  execFileSync(process.execPath,['node_modules/eslint/bin/eslint.js','native/App.js'],{stdio:'inherit'});
  console.log('Checked '+paths.length+' JavaScript modules and native/App.js');
} else if (mode==='integrity') {
  for (const path of [...paths,'native/App.js','public/index.html','public/styles.css','public/hero.jpg','public/manifest.webmanifest','package-lock.json','.github/workflows/ci.yml','docs/premium-ui-and-running-community.md']) await access(path);
  const server=await readFile('server.mjs','utf8');
  for (const path of ['app.js','styles.css','model.js','running.js','fuel.js','sw.js']) {
    if (!server.includes("'/"+path+"'")) throw new Error('Required Web entry is not routed: '+path);
  }
  const pkg=JSON.parse(await readFile('package.json','utf8'));
  const lock=JSON.parse(await readFile('package-lock.json','utf8'));
  for (const group of ['dependencies','devDependencies']) for (const [name,version] of Object.entries(pkg[group]||{})) {
    if (lock.packages[''][group]?.[name]!==version) throw new Error('Lockfile differs: '+name);
  }
  console.log('Project entry points, routes and lockfile verified');
} else if (mode==='ios') {
  const raw=execFileSync(process.execPath,['node_modules/expo/bin/cli','config','--type','introspect','--json'],{encoding:'utf8',env:{...process.env,EXPO_NO_TELEMETRY:'1',BREAKWIND_HEALTHKIT:'1'}});
  const cfg=JSON.parse(raw);
  const ios=cfg._internal.modResults.ios;
  if (ios.infoPlist.UIBackgroundModes?.some(m=>['location','fetch','processing'].includes(m)) || Object.keys(ios.infoPlist).some(k=>/^NS(Location|Health|Motion).*UsageDescription$/.test(k)) || ios.entitlements['com.apple.developer.healthkit']) throw new Error('Launch must not request location/HealthKit or background tracking');
  console.log('Launch iOS has no location background mode or HealthKit entitlement');
} else throw new Error('Unknown check mode');
