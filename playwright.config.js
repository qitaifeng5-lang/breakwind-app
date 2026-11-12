import { defineConfig, devices } from '@playwright/test';

const port=process.env.BREAKWIND_TEST_PORT || '4198';
const url='http://127.0.0.1:'+port;

export default defineConfig({
  testDir:'qa',
  fullyParallel:true,
  workers:2,
  retries:0,
  reporter:process.env.CI ? [['line'],['html',{open:'never'}]] : 'list',
  use:{baseURL:url,browserName:'chromium',channel:process.env.BREAKWIND_TEST_BROWSER || undefined,locale:'zh-CN',timezoneId:'America/Toronto',
    serviceWorkers:'block',reducedMotion:'reduce',screenshot:'only-on-failure',trace:'retain-on-failure'},
  projects:[
    {name:'compact-320',use:{viewport:{width:320,height:568},isMobile:true,hasTouch:true}},
    {name:'iphone-small',use:{...devices['iPhone SE'],defaultBrowserType:'chromium'}},
    {name:'iphone-standard',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}},
    {name:'iphone-large',use:{...devices['iPhone 14 Pro Max'],defaultBrowserType:'chromium'}},
    {name:'android',use:{...devices['Pixel 7'],defaultBrowserType:'chromium'}},
    {name:'desktop',use:{viewport:{width:1440,height:900}}}
  ],
  webServer:{command:'npm run build:native-web && node server.mjs',url:url+'/',env:{PORT:port,BREAKWIND_VISION_MODEL:''},reuseExistingServer:false,timeout:30000}
});
