import {spawn} from 'node:child_process';
const [major,minor]=process.versions.node.split('.').map(Number);if(major<22||(major===22&&minor<13)){console.error('Cần Node.js 22.13 trở lên. Hãy cài Node.js LTS mới.');process.exit(1);}
const backend=spawn(process.execPath,['server/start.mjs'],{stdio:'inherit'});
const expo=spawn(process.execPath,['node_modules/expo/bin/cli','start','--go',...process.argv.slice(2)],{stdio:'inherit',env:process.env});
let stopping=false;const stop=code=>{if(stopping)return;stopping=true;backend.kill();expo.kill();process.exit(code??0);};
backend.on('exit',code=>stop(code||0));expo.on('exit',code=>stop(code||0));process.on('SIGINT',()=>stop(0));process.on('SIGTERM',()=>stop(0));
