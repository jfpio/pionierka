import assert from 'node:assert/strict';
import {test} from 'node:test';
import {defaults,shelfDefaults,bounds,parts,members,assembly,roofCollision,collisions,nextLayout,validate,connected,materialList,clearance,DEFAULT_TENT,validateTent,tentMasts} from '../app/model.ts';
const bed=(patch={})=>({id:'a',levels:2,...defaults,width:80,length:180,lower:50,upper:150,z:-120,...patch});
const shelf=(patch={})=>({id:'s',kind:'shelf',levels:3,...shelfDefaults,width:80,length:40,lower:30,middle:75,upper:120,z:-120,...patch});
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('usable dimensions exclude poles, physical footprint remains checked',()=>{const b=bed({z:0});assert.deepEqual(bounds(b),{minX:-48,maxX:48,minZ:-98,maxZ:98});for(const axis of [0,2]){const p=parts(b),min=Math.min(...p.map(s=>Math.min(s.a[axis],s.b[axis])-(s.a[axis]===s.b[axis]?s.radius:0))),max=Math.max(...p.map(s=>Math.max(s.a[axis],s.b[axis])+(s.a[axis]===s.b[axis]?s.radius:0)));assert.equal(max-min,axis===0?96:196)}});
test('posts end at highest surface for beds and shelf',()=>{for(const b of [bed({levels:1}),bed(),shelf()])assert.equal(Math.max(...parts(b).flatMap(p=>[p.a[1],p.b[1]])),b.levels===1?50:b.upper)});
test('20 cm accepted, smaller gap rejected at sides and back',()=>{for(const [axis,position] of [['x',132],['x',-132],['z',-132]]){const b=bed({[axis]:position});approx(clearance(b),20);assert.equal(collisions([b]).a.length,0);assert.ok(collisions([bed({[axis]:position+Math.sign(position)*.01})]).a.some(e=>e.includes('20 cm')))}});
test('entrance allows zero setback but not going outside tent',()=>{assert.equal(collisions([bed({x:60,z:152})]).a.length,0);assert.ok(collisions([bed({x:60,z:152.01})]).a.some(e=>e.includes('poza obrys')))});
test('rotation includes real pole envelope',()=>{approx(clearance(bed({rotation:90,x:82})),20);assert.equal(collisions([bed({rotation:90,x:82})]).a.length,0);assert.ok(collisions([bed({rotation:90,x:82.1})]).a.length)});
test('roof contact is error, tiny gap fits; slope versus ridge',()=>{assert.equal(roofCollision(bed({upper:228.85})),true);assert.equal(roofCollision(bed({upper:228.84})),false);assert.equal(roofCollision(bed({upper:180,x:132})),true);assert.equal(roofCollision(bed({upper:180})),false)});
test('same-height long side shares 2 posts and 2 rails',()=>{const a=bed({x:-44}),b=bed({id:'b',x:44});assert.equal(connected(a,b),true);assert.equal(collisions([a,b]).a.length,0);const m=materialList([a,b]);assert.equal(m.saved,4);assert.equal(m.poles,20);approx(m.fabricArea,4*.8*1.8)});
test('all four target sides accept rotated unequal beds or shelves',()=>{for(const object of [bed({id:'b',rotation:90}),bed({id:'b',length:120}),shelf()])for(const side of ['left','right','back','front']){const s=nextLayout({beds:[bed(),object],selected:object.id},{type:'join',id:object.id,targetId:'a',side});assert.equal(connected(...s.beds),true);assert.ok(materialList(s.beds).saved>0)}});
test('short sides share correct beams',()=>{const a=bed({z:-94}),b=bed({id:'b',z:94});assert.equal(connected(a,b),true);assert.equal(materialList([a,b]).saved,4)});
test('mixed heights share posts and only matching rail',()=>{const a=bed({levels:1,x:-44}),b=bed({id:'b',x:44});const m=materialList([a,b]);assert.equal(m.saved,3);assert.equal(m.poles,17);assert.equal(assembly([a,b]).filter(p=>p.kind==='post').length,6)});
test('shelf boards are separate from bed cloth',()=>{const m=materialList([shelf()]);assert.equal(m.poles,16);assert.equal(m.fabrics.length,0);assert.equal(m.boards.length,3);assert.deepEqual(m.boards[0],{width:80,length:40})});
test('partial aligned rails merge once without losing their lengths',()=>{const a=bed(),b=bed({id:'b',x:88,length:100,z:-160});const all=assembly([a,b]);assert.equal(connected(a,b),true);assert.equal(materialList([a,b]).saved,3);assert.equal(all.filter(m=>m.kind==='rail'&&m.owners.length===2).length,2)});
test('accidental overlap does not count as connection',()=>{const a=bed(),b=bed({id:'b',x:70});assert.equal(connected(a,b),false);assert.equal(materialList([a,b]).saved,0);assert.ok(collisions([a,b]).a.length)});
test('snap, separate, join and remove keep materials consistent',()=>{let s={beds:[bed({x:-88}),bed({id:'b',x:5})],selected:'b'};s=nextLayout(s,{type:'snap',id:'b'});assert.equal(connected(...s.beds),true);s=nextLayout(s,{type:'update',id:'b',patch:{x:30}});assert.equal(materialList(s.beds).saved,0);s=nextLayout(s,{type:'join',id:'b',targetId:'a'});assert.equal(connected(...s.beds),true);s=nextLayout(s,{type:'remove',id:'a'});assert.equal(materialList(s.beds).poles,12)});
test('shelf dimensions and heights use shared state and validation',()=>{let s=nextLayout({beds:[],selected:null},{type:'add',kind:'shelf',levels:3});assert.equal(collisions(s.beds)[s.selected].length,0);s=nextLayout(s,{type:'update',id:s.selected,patch:{width:90,length:45,upper:140,middle:80}});assert.equal(s.beds[0].upper,140);assert.throws(()=>nextLayout(s,{type:'update',id:s.selected,patch:{upper:70}}));assert.throws(()=>validate(shelf({middle:NaN})));assert.throws(()=>validate(bed({width:0})));assert.throws(()=>validate(bed({x:NaN})));assert.throws(()=>validate(bed({upper:50})))});

test('catalog uses Agricola bed and three-person shelf dimensions',()=>{let s=nextLayout({beds:[],selected:null},{type:'add',levels:2});assert.deepEqual([s.beds[0].width,s.beds[0].length,s.beds[0].lower,s.beds[0].upper],[75,185,35,120]);s=nextLayout(s,{type:'add',kind:'shelf',levels:3});const b=s.beds[1];assert.deepEqual([b.width,b.length,b.lower,b.middle,b.upper],[90,30,45,90,135]);assert.deepEqual(materialList([b]).boards[0],{width:90,length:30});});

test('clear empties selection and undo restores original models alongside new ones',()=>{const original={beds:[bed(),shelf()],selected:'s'};const empty=nextLayout(original,{type:'clear'});assert.deepEqual(empty,{beds:[],selected:null});const added=nextLayout(empty,{type:'add',levels:1});const restored=nextLayout(added,{type:'restore',layout:original});assert.equal(restored.beds.length,3);assert.equal(restored.selected,'s');assert.equal(nextLayout(restored,{type:'restore',layout:original}).beds.length,3)});
test('new shelf levels keep total height and distribute evenly',()=>{const original={beds:[shelf()],selected:'s'};const result=nextLayout(original,{type:'shelf-level',id:'s',delta:1});const b=result.beds[0];assert.equal(b.shelfCount,4);assert.equal(b.lower,30);assert.equal(b.upper,120);assert.deepEqual(materialList([b]).boards.length,4);const levels=[...new Set(members(b).filter(m=>m.kind==='rail').map(m=>m.a[1]+4))];assert.deepEqual(levels,[30,60,90,120]);assert.equal(materialList([b]).poles,20);const reduced=nextLayout(result,{type:'shelf-level',id:'s',delta:-1});assert.equal(reduced.beds[0].middle,75);assert.equal(nextLayout(original,{type:'shelf-level',id:'s',delta:-1}).beds[0].shelfCount,2);assert.throws(()=>nextLayout({beds:[bed()],selected:'a'},{type:'shelf-level',id:'a',delta:1}))});
test('shelf level minimum spacing enforced without mutation',()=>{const original={beds:[shelf({lower:100,middle:110,upper:120})],selected:'s'};assert.throws(()=>nextLayout(original,{type:'shelf-level',id:'s',delta:1}));assert.equal(original.beds[0].shelfCount,undefined)});
import {joinStatus} from '../app/model.ts';
test('green join choices agree with resulting collision checks',()=>{const beds=[bed({x:-120}),shelf()];const good=joinStatus(beds,'s','a','right'),bad=joinStatus(beds,'s','a','left');assert.equal(good.valid,true);assert.equal(bad.valid,false);assert.ok(bad.errors.some(e=>e.includes('20 cm')));const after=nextLayout({beds,selected:'s'},{type:'join',id:'s',targetId:'a',side:'right'});assert.equal(collisions(after.beds).s.length,0);assert.deepEqual(after.beds[1],good.candidate)});

test('bed levels preserve current surfaces and equal spacing through 1-2-3-2-1',()=>{let s={beds:[bed({levels:1,lower:35,upper:120})],selected:'a'};s=nextLayout(s,{type:'bed-level',id:'a',delta:1});assert.deepEqual([s.beds[0].lower,s.beds[0].upper],[35,120]);s=nextLayout(s,{type:'bed-level',id:'a',delta:1});assert.deepEqual([s.beds[0].lower,s.beds[0].middle,s.beds[0].upper],[35,120,205]);assert.equal(materialList(s.beds).fabrics.length,3);assert.throws(()=>nextLayout(s,{type:'bed-level',id:'a',delta:1}));s=nextLayout(s,{type:'bed-level',id:'a',delta:-1});assert.equal(s.beds[0].upper,120);s=nextLayout(s,{type:'bed-level',id:'a',delta:-1});assert.equal(s.beds[0].lower,35);assert.equal(s.beds[0].levels,1);assert.throws(()=>nextLayout(s,{type:'bed-level',id:'a',delta:-1}))});
test('loading validates before replacing layout',()=>{const original={beds:[bed()],selected:'a'};assert.throws(()=>nextLayout(original,{type:'load',layout:{beds:[bed({width:0})],selected:'a'}}));assert.equal(original.beds.length,1);assert.deepEqual(nextLayout({beds:[],selected:null},{type:'load',layout:original}),{...original,tent:{...DEFAULT_TENT}})});

import {dropPreview,mastCollisions} from '../app/model.ts';
test('three mast positions reject beds and shelves even with roof hidden',()=>{for(const z of [-250,0,250]){assert.equal(mastCollisions(bed({z})).length,1);assert.equal(mastCollisions(shelf({z})).length,1);assert.ok(collisions([bed({z})]).a.some(e=>e.includes('masztem')))}});
test('mast radius, rotation and exact contact are included',()=>{assert.equal(mastCollisions(bed({x:52,z:0})).length,1);assert.equal(mastCollisions(bed({x:52.01,z:0})).length,0);assert.equal(mastCollisions(bed({x:102,z:0,rotation:90})).length,1)});
test('blue preview matches drop result and rejects unsafe snap',()=>{const beds=[bed({x:-88}),bed({id:'b',x:5})];assert.ok(collisions(beds).b.length);const preview=dropPreview(beds,'b');assert.ok(preview);const result=nextLayout({beds,selected:'b'},{type:'snap',id:'b'});assert.deepEqual(preview.candidate,result.beds[1]);assert.equal(collisions(result.beds).b.length,0);assert.equal(dropPreview(beds.map(b=>({...b,z:0})),'b'),null);assert.equal(dropPreview([bed({x:-88}),bed({id:'b',x:5,upper:260})],'b'),null);assert.equal(dropPreview([bed({x:-88}),bed({id:'b',x:40})],'b'),null)});

test('shelf supports one and two shelves with correct geometry and materials',()=>{let s={beds:[shelf()],selected:'s'};s=nextLayout(s,{type:'shelf-level',id:'s',delta:-1});assert.equal(materialList(s.beds).boards.length,2);s=nextLayout(s,{type:'shelf-level',id:'s',delta:-1});assert.equal(s.beds[0].shelfCount,1);assert.equal(materialList(s.beds).boards.length,1);assert.equal(materialList(s.beds).poles,8);assert.deepEqual([...new Set(members(s.beds[0]).filter(m=>m.kind==='rail').map(m=>m.a[1]+4))],[120]);assert.throws(()=>nextLayout(s,{type:'shelf-level',id:'s',delta:-1}));s=nextLayout(s,{type:'shelf-level',id:'s',delta:1});assert.equal(s.beds[0].upper,120);assert.equal(materialList(s.beds).boards.length,2)});

test('changing tent width and length recalculates walls and entrance clearance',()=>{
 const b=bed({x:132}),larger={...DEFAULT_TENT,width:600,length:700};
 approx(clearance(b),20);approx(clearance(b,larger),120);
 assert.ok(collisions([bed({x:150})]).a.some(e=>e.includes('20 cm')));
 assert.deepEqual(collisions([bed({x:150})],larger).a,[]);
 assert.ok(collisions([bed({x:70,z:252})]).a.some(e=>e.includes('obrys')));
 assert.deepEqual(collisions([bed({x:70,z:252})],larger).a,[]);
});
test('mast positions follow tent length including exact physical contact',()=>{
 const tent={...DEFAULT_TENT,length:700};
 assert.deepEqual(tentMasts(tent).map(m=>m.z),[-350,0,350]);
 assert.equal(mastCollisions(bed({z:350}),tent).length,1);
 assert.equal(mastCollisions(bed({z:240}),tent).length,0);
 assert.equal(mastCollisions(bed({x:52,z:350}),tent).length,1);
});
test('roof plane uses edited width and heights including flat roofs and rotation',()=>{
 const b=bed({x:132,upper:180});
 assert.equal(roofCollision(b),true);
 assert.equal(roofCollision(b,{...DEFAULT_TENT,width:600}),false);
 assert.equal(roofCollision(b,{...DEFAULT_TENT,wallHeight:200,ridgeHeight:300}),false);
 for(const rotation of [0,90]){
  const flat={...DEFAULT_TENT,wallHeight:200,ridgeHeight:200};
  assert.equal(roofCollision(bed({rotation,upper:200}),flat),true);
  assert.equal(roofCollision(bed({rotation,upper:199.99}),flat),false);
 }
});
test('tent editing rejects invalid values without mutating beds or dimensions',()=>{
 const original={beds:[bed()],selected:'a',tent:{...DEFAULT_TENT}};
 for(const patch of [{width:0},{length:Infinity},{wallHeight:NaN},{ridgeHeight:100},{width:2001},{unexpected:20}])assert.throws(()=>nextLayout(original,{type:'update-tent',patch}));
 assert.deepEqual(original.tent,DEFAULT_TENT);
 const changed=nextLayout(original,{type:'update-tent',patch:{width:600,length:700}});
 assert.equal(changed.beds,original.beds);assert.equal(changed.selected,'a');assert.equal(changed.tent.width,600);
 assert.throws(()=>validateTent({...DEFAULT_TENT,ridgeHeight:'250'}));
});
test('custom tent dimensions survive save/load and old projects restore default tent',()=>{
 const custom={beds:[bed()],selected:'a',tent:{width:600,length:700,wallHeight:200,ridgeHeight:300}};
 assert.deepEqual(nextLayout({beds:[],selected:null},{type:'load',layout:JSON.parse(JSON.stringify(custom))}),custom);
 const legacy={beds:[bed()],selected:'a'};
 assert.deepEqual(nextLayout(custom,{type:'load',layout:legacy}).tent,DEFAULT_TENT);
 assert.throws(()=>nextLayout(custom,{type:'load',layout:{...custom,tent:{...custom.tent,width:NaN}}}));
 assert.equal(custom.tent.width,600);
});
test('clear and remove retain tent while new project resets it',()=>{
 const original={beds:[bed()],selected:'a',tent:{...DEFAULT_TENT,width:600}};
 assert.equal(nextLayout(original,{type:'clear'}).tent.width,600);
 assert.equal(nextLayout(original,{type:'remove',id:'a'}).tent.width,600);
 assert.deepEqual(nextLayout(original,{type:'reset'}),{beds:[],selected:null,tent:{...DEFAULT_TENT}});
});
test('new beds find available positions across an edited tent',()=>{
 const tent={...DEFAULT_TENT,width:600,length:700,wallHeight:200,ridgeHeight:300};
 const next=nextLayout({beds:[],selected:null,tent},{type:'add',levels:2});
 assert.equal(next.tent,tent);assert.deepEqual(collisions(next.beds,tent)[next.selected],[]);
 assert.ok(next.beds[0].z< -120);
});
test('join and blue snap preview evaluate the edited tent instead of defaults',()=>{
 const beds=[bed({x:144}),bed({id:'b',x:235})],tent={...DEFAULT_TENT,width:800,wallHeight:200,ridgeHeight:300};
 assert.equal(joinStatus(beds,'b','a','right').valid,false);
 assert.equal(joinStatus(beds,'b','a','right',tent).valid,true);
 assert.equal(dropPreview(beds,'b'),null);
 const preview=dropPreview(beds,'b',tent);assert.ok(preview);
 const joined=nextLayout({beds,selected:'b',tent},{type:'snap',id:'b'});
 assert.deepEqual(joined.beds[1],preview.candidate);assert.deepEqual(collisions(joined.beds,tent).b,[]);
});
