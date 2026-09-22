import { build } from 'esbuild';
const result=await build({entryPoints:['tests/core.test.ts'],bundle:true,platform:'node',format:'esm',write:false,target:'node24'});
await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].contents).toString('base64'));
