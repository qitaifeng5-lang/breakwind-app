import globals from 'globals';

export default [
  {ignores:['node_modules/**','dist/**','.expo/**','ios/**','android/**','playwright-report/**','test-results/**']},
  {files:['**/*.js','**/*.mjs'],languageOptions:{
    ecmaVersion:'latest',sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}},
    globals:{...globals.node,...globals.browser,BarcodeDetector:'readonly'}
  },rules:{'no-undef':'error','no-unreachable':'error','no-dupe-keys':'error','no-constant-condition':['error',{checkLoops:false}],'valid-typeof':'error'}}
];
