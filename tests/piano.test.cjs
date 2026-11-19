const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const W = require('../piano.js');
const note = (t,beats,midis,extra={}) => ({t,beats,midis,...extra});
test('audio plan merges ties per hand, clips edges, preserves score objects',()=>{
 const hands=[[note(0,2,[60],{tie:true}),note(2,2,[60],{cont:true}),note(4,1,[62])],[note(0,4,[48])]];
 const before=JSON.stringify(hands);const plan=W.plan(hands,1,3,b=>b*.5);
 assert.deepEqual(plan,[{midi:60,time:0,duration:1,offset:.5,velocity:.62},{midi:48,time:0,duration:1,offset:.5,velocity:.62}]);
 assert.equal(JSON.stringify(hands),before);
});
test('swing affects duration as well as onset; whole notes retain full slow duration',()=>{
 const swing=b=>Math.floor(b)+(b%1===.5?2/3:b%1);
 assert.equal(W.plan([[note(.5,.5,[60])]],0,1,swing)[0].duration,1/3+Number.EPSILON/4);
 const p=W.plan([[note(0,4,[60])]],0,4,b=>b*3);assert.equal(p[0].duration,12);
});
test('full sample range and layer boundaries',()=>{
 assert.equal(W.ROOTS.length,30);assert.equal(W.rootOf(21),21);assert.equal(W.rootOf(108),108);
 assert.equal(W.layerOf(.2),5);assert.equal(W.layerOf(.62),8);assert.equal(W.layerOf(.9),10);
});
function context(){
 let starts=0,stops=0;const nodes=[];
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
 const node=()=>{const n={gain:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),playbackRate:param(),connect(){return arguments[0]},disconnect(){this.disconnected=true},start(){starts++},stop(){stops++}};nodes.push(n);return n};
 const ctx={currentTime:0,sampleRate:44100,createGain:node,createBiquadFilter:node,createConvolver:node,createChannelSplitter:node,createChannelMerger:node,createDynamicsCompressor:node,createBufferSource:node,createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(n)}),decodeAudioData:async()=>({duration:5})};
 return {ctx,node,nodes,counts:()=>({starts,stops})};
}
test('no waiting or late replay; duplicate fetch; capped loaded and fallback voices; cleanup',async()=>{
 const c=context();let fetches=0,fall=0;global.fetch=async()=>{fetches++;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}};
 const engine=W.create(c.ctx,c.node(),()=>{fall++;return c.node()});
 engine.play(60);assert.equal(fall,1);assert.equal(c.counts().starts,0);
 await engine.request(60);await new Promise(r=>setImmediate(r));assert.equal(fetches,1);assert.equal(c.counts().starts,0);
 for(let i=0;i<100;i++)engine.play(60);assert.equal(c.counts().starts,100);assert.equal(engine.stats().voices,32);
 const dest=c.node();for(let i=0;i<100;i++)engine.play(1,0,dest);assert.equal(engine.stats().voices,64);
 engine.stopRoute(dest);assert.equal(engine.stats().voices,32);
 // Unsupported notes keep using fallback. A resumed expired sample never produces a new attack.
 assert.equal(engine.play(60,0,undefined,{offset:10}),null);
});
test('network error resolves to fallback without rejection; decoded cache bound',async()=>{
 const c=context();let fall=0;global.fetch=async()=>{throw new Error('offline')};const e=W.create(c.ctx,c.node(),()=>{fall++;return c.node()});
 assert.equal(await e.request(72),false);e.play(72);assert.equal(fall,1);
 global.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
 for(let m=21;m<108;m+=3)for(let v of [5,8])await e.request(m,v);
 assert.ok(e.stats().buffers<=36);
});
test('inline scripts and changed scripts parse',()=>{
 for(const f of ['piano.js','demo.js','song-mode.js'])new vm.Script(fs.readFileSync(require.resolve('../'+f),'utf8'));
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 assert.ok(html.includes('playPiano(m);'));assert.ok(fs.readFileSync(require.resolve('../game.js'),'utf8').includes('beep('));
});
test('missing or failed recorder module leaves interactive audio and the legacy score demo working',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const audio=html.slice(html.indexOf('let audio = null;'),html.indexOf('// ---- 進行 ----'));
 const song=fs.readFileSync(require.resolve('../song-mode.js'),'utf8');
 const demo=song.match(/const playSongDemo = \(\) => \{[\s\S]*?^\};/m)[0];
 for (const moduleState of [{},{WarmPiano:{create(){throw Error('failed module init')}}}]) {
  const c=context();Object.assign(c.ctx,{state:'running',destination:c.node(),createPeriodicWave:()=>({}),
    createOscillator:()=>Object.assign(c.node(),{setPeriodicWave(){}})});
  let options;
  const sandbox=vm.createContext({
   ...moduleState,kbRange:[48,84], navigator:{}, document:{addEventListener(){}},
   AudioContext:function(){return c.ctx;},console:{warn(){}},songRun:{events:[{t:0,keys:[{midi:60}]}],song:{tempo:100},step:{kind:'other'}},
   stopSongAudio(){},pauseSongMixer(){},playBeat:(_s,t)=>t,Demo:{play(_btn,o){options=o;}},$:()=>({}),
  });
  vm.runInContext(audio+'\n'+demo+'\nplayPiano(60); playSongDemo();',sandbox);
  assert.equal(c.counts().starts,1);
  assert.equal(options.len,1.5);
  options.schedule(c.node(),0,0);
  assert.equal(c.counts().starts,2);
 }
});
