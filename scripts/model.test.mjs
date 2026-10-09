import assert from 'node:assert/strict';
import {test} from 'node:test';
import {defaults,shelfDefaults,bounds,parts,members,assembly,roofCollision,collisions,nextLayout,validate,connected,materialList,clearance,DEFAULT_TENT,validateTent,tentMasts,DEFAULT_CONSTRUCTION,validateConstruction} from '../app/model.ts';
const bed=(patch={})=>({id:'a',levels:2,...defaults,width:80,length:180,lower:50,upper:150,z:-120,...patch});
const shelf=(patch={})=>({id:'s',kind:'shelf',levels:3,...shelfDefaults,width:80,length:40,lower:30,middle:75,upper:120,z:-120,...patch});
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('dimensions locate pole axes and physical footprint includes half a diameter on each side',()=>{const b=bed({z:0});assert.deepEqual(bounds(b),{minX:-44,maxX:44,minZ:-94,maxZ:94});for(const axis of [0,2]){const p=parts(b),min=Math.min(...p.map(s=>Math.min(s.a[axis],s.b[axis])-(s.a[axis]===s.b[axis]?s.radius:0))),max=Math.max(...p.map(s=>Math.max(s.a[axis],s.b[axis])+(s.a[axis]===s.b[axis]?s.radius:0)));assert.equal(max-min,axis===0?88:188)}});
test('posts end at highest surface for beds and shelf',()=>{for(const b of [bed({levels:1}),bed(),shelf()])assert.equal(Math.max(...parts(b).flatMap(p=>[p.a[1],p.b[1]])),b.levels===1?50:b.upper)});
test('20 cm accepted, smaller gap rejected at sides and back',()=>{for(const [axis,position] of [['x',136],['x',-136],['z',-136]]){const b=bed({[axis]:position});approx(clearance(b),20);assert.equal(collisions([b]).a.length,0);assert.ok(collisions([bed({[axis]:position+Math.sign(position)*.01})]).a.some(e=>e.includes('20 cm')))}});
test('entrance allows zero setback but not going outside tent',()=>{assert.equal(collisions([bed({x:60,z:156})]).a.length,0);assert.ok(collisions([bed({x:60,z:156.01})]).a.some(e=>e.includes('poza obrys')))});
test('rotation includes real pole envelope',()=>{approx(clearance(bed({rotation:90,x:86})),20);assert.equal(collisions([bed({rotation:90,x:86})]).a.length,0);assert.ok(collisions([bed({rotation:90,x:86.1})]).a.length)});
test('roof contact is error, tiny gap fits; slope versus ridge',()=>{assert.equal(roofCollision(bed({upper:230.65})),true);assert.equal(roofCollision(bed({upper:230.64})),false);assert.equal(roofCollision(bed({upper:180,x:132})),true);assert.equal(roofCollision(bed({upper:180})),false)});
test('same-height long side shares 2 posts and 2 rails',()=>{const a=bed({x:-40}),b=bed({id:'b',x:40});assert.equal(connected(a,b),true);assert.equal(collisions([a,b]).a.length,0);const m=materialList([a,b]);assert.equal(m.saved,4);assert.equal(m.poles,20);approx(m.fabricArea,4*.8*1.8)});
test('all four target sides accept rotated unequal beds or shelves',()=>{for(const object of [bed({id:'b',rotation:90}),bed({id:'b',length:120}),shelf()])for(const side of ['left','right','back','front']){const s=nextLayout({beds:[bed(),object],selected:object.id},{type:'join',id:object.id,targetId:'a',side});assert.equal(connected(...s.beds),true);assert.ok(materialList(s.beds).saved>0)}});
test('short sides share correct beams',()=>{const a=bed({z:-90}),b=bed({id:'b',z:90});assert.equal(connected(a,b),true);assert.equal(materialList([a,b]).saved,4)});
test('mixed heights share posts and only matching rail',()=>{const a=bed({levels:1,x:-40}),b=bed({id:'b',x:40});const m=materialList([a,b]);assert.equal(m.saved,3);assert.equal(m.poles,17);assert.equal(assembly([a,b]).filter(p=>p.kind==='post').length,6)});
test('shelf boards are separate from bed cloth',()=>{const m=materialList([shelf()]);assert.equal(m.poles,16);assert.equal(m.fabrics.length,0);assert.equal(m.boards.length,3);assert.deepEqual(m.boards[0],{width:80,length:40})});
test('partial aligned rails merge once without losing their lengths',()=>{const a=bed(),b=bed({id:'b',x:80,length:100,z:-160});const all=assembly([a,b]);assert.equal(connected(a,b),true);assert.equal(materialList([a,b]).saved,3);assert.equal(all.filter(m=>m.kind==='rail'&&m.owners.length===2).length,2)});
test('accidental overlap does not count as connection',()=>{const a=bed(),b=bed({id:'b',x:70});assert.equal(connected(a,b),false);assert.equal(materialList([a,b]).saved,0);assert.ok(collisions([a,b]).a.length)});
test('snap, separate, join and remove keep materials consistent',()=>{let s={beds:[bed({x:-80}),bed({id:'b',x:5})],selected:'b'};s=nextLayout(s,{type:'snap',id:'b'});assert.equal(connected(...s.beds),true);s=nextLayout(s,{type:'update',id:'b',patch:{x:30}});assert.equal(materialList(s.beds).saved,0);s=nextLayout(s,{type:'join',id:'b',targetId:'a'});assert.equal(connected(...s.beds),true);s=nextLayout(s,{type:'remove',id:'a'});assert.equal(materialList(s.beds).poles,12)});
test('shelf dimensions and heights use shared state and validation',()=>{let s=nextLayout({beds:[],selected:null},{type:'add',kind:'shelf',levels:3});assert.equal(collisions(s.beds)[s.selected].length,0);s=nextLayout(s,{type:'update',id:s.selected,patch:{width:90,length:45,upper:140,middle:80}});assert.equal(s.beds[0].upper,140);assert.throws(()=>nextLayout(s,{type:'update',id:s.selected,patch:{upper:70}}));assert.throws(()=>validate(shelf({middle:NaN})));assert.throws(()=>validate(bed({width:0})));assert.throws(()=>validate(bed({x:NaN})));assert.throws(()=>validate(bed({upper:50})))});

test('catalog uses Agricola bed and three-person shelf dimensions',()=>{let s=nextLayout({beds:[],selected:null},{type:'add',levels:2});assert.deepEqual([s.beds[0].width,s.beds[0].length,s.beds[0].lower,s.beds[0].upper],[75,185,35,120]);s=nextLayout(s,{type:'add',kind:'shelf',levels:3});const b=s.beds[1];assert.deepEqual([b.width,b.length,b.lower,b.middle,b.upper],[90,30,45,90,135]);assert.deepEqual(materialList([b]).boards[0],{width:90,length:30});});

test('clear empties selection and undo restores original models alongside new ones',()=>{const original={beds:[bed(),shelf()],selected:'s'};const empty=nextLayout(original,{type:'clear'});assert.deepEqual(empty,{beds:[],selected:null});const added=nextLayout(empty,{type:'add',levels:1});const restored=nextLayout(added,{type:'restore',layout:original});assert.equal(restored.beds.length,3);assert.equal(restored.selected,'s');assert.equal(nextLayout(restored,{type:'restore',layout:original}).beds.length,3)});
test('new shelf levels keep total height and distribute evenly',()=>{const original={beds:[shelf()],selected:'s'};const result=nextLayout(original,{type:'shelf-level',id:'s',delta:1});const b=result.beds[0];assert.equal(b.shelfCount,4);assert.equal(b.lower,30);assert.equal(b.upper,120);assert.deepEqual(materialList([b]).boards.length,4);const levels=[...new Set(members(b).filter(m=>m.kind==='rail').map(m=>m.a[1]+4))];assert.deepEqual(levels,[30,60,90,120]);assert.equal(materialList([b]).poles,20);const reduced=nextLayout(result,{type:'shelf-level',id:'s',delta:-1});assert.equal(reduced.beds[0].middle,75);assert.equal(nextLayout(original,{type:'shelf-level',id:'s',delta:-1}).beds[0].shelfCount,2);assert.throws(()=>nextLayout({beds:[bed()],selected:'a'},{type:'shelf-level',id:'a',delta:1}))});
test('shelf level minimum spacing enforced without mutation',()=>{const original={beds:[shelf({lower:100,middle:110,upper:120})],selected:'s'};assert.throws(()=>nextLayout(original,{type:'shelf-level',id:'s',delta:1}));assert.equal(original.beds[0].shelfCount,undefined)});
import {joinStatus} from '../app/model.ts';
test('green join choices agree with resulting collision checks',()=>{const beds=[bed({x:-120}),shelf()];const good=joinStatus(beds,'s','a','right'),bad=joinStatus(beds,'s','a','left');assert.equal(good.valid,true);assert.equal(bad.valid,false);assert.ok(bad.errors.some(e=>e.includes('20 cm')));const after=nextLayout({beds,selected:'s'},{type:'join',id:'s',targetId:'a',side:'right'});assert.equal(collisions(after.beds).s.length,0);assert.deepEqual(after.beds[1],good.candidate)});

test('bed levels preserve current surfaces and equal spacing through 1-2-3-2-1',()=>{let s={beds:[bed({levels:1,lower:35,upper:120})],selected:'a'};s=nextLayout(s,{type:'bed-level',id:'a',delta:1});assert.deepEqual([s.beds[0].lower,s.beds[0].upper],[35,120]);s=nextLayout(s,{type:'bed-level',id:'a',delta:1});assert.deepEqual([s.beds[0].lower,s.beds[0].middle,s.beds[0].upper],[35,120,205]);assert.equal(materialList(s.beds).fabrics.length,3);assert.throws(()=>nextLayout(s,{type:'bed-level',id:'a',delta:1}));s=nextLayout(s,{type:'bed-level',id:'a',delta:-1});assert.equal(s.beds[0].upper,120);s=nextLayout(s,{type:'bed-level',id:'a',delta:-1});assert.equal(s.beds[0].lower,35);assert.equal(s.beds[0].levels,1);assert.throws(()=>nextLayout(s,{type:'bed-level',id:'a',delta:-1}))});
test('loading validates before replacing layout',()=>{const original={beds:[bed()],selected:'a'};assert.throws(()=>nextLayout(original,{type:'load',layout:{beds:[bed({width:0})],selected:'a'}}));assert.equal(original.beds.length,1);assert.deepEqual(nextLayout({beds:[],selected:null},{type:'load',layout:original}),{...original,tent:{...DEFAULT_TENT},construction:{...DEFAULT_CONSTRUCTION}})});

import {dropPreview,mastCollisions} from '../app/model.ts';
test('three mast positions reject beds and shelves even with roof hidden',()=>{for(const z of [-250,0,250]){assert.equal(mastCollisions(bed({z})).length,1);assert.equal(mastCollisions(shelf({z})).length,1);assert.ok(collisions([bed({z})]).a.some(e=>e.includes('masztem')))}});
test('mast radius, rotation and exact contact are included',()=>{assert.equal(mastCollisions(bed({x:48,z:0})).length,1);assert.equal(mastCollisions(bed({x:48.01,z:0})).length,0);assert.equal(mastCollisions(bed({x:98,z:0,rotation:90})).length,1)});
test('blue preview matches drop result and rejects unsafe snap',()=>{const beds=[bed({x:-80}),bed({id:'b',x:5})];assert.ok(collisions(beds).b.length);const preview=dropPreview(beds,'b');assert.ok(preview);const result=nextLayout({beds,selected:'b'},{type:'snap',id:'b'});assert.deepEqual(preview.candidate,result.beds[1]);assert.equal(collisions(result.beds).b.length,0);assert.equal(dropPreview(beds.map(b=>({...b,z:0})),'b'),null);assert.equal(dropPreview([bed({x:-80}),bed({id:'b',x:5,upper:260})],'b'),null);assert.equal(dropPreview([bed({x:-80}),bed({id:'b',x:40})],'b'),null)});

test('shelf supports one and two shelves with correct geometry and materials',()=>{let s={beds:[shelf()],selected:'s'};s=nextLayout(s,{type:'shelf-level',id:'s',delta:-1});assert.equal(materialList(s.beds).boards.length,2);s=nextLayout(s,{type:'shelf-level',id:'s',delta:-1});assert.equal(s.beds[0].shelfCount,1);assert.equal(materialList(s.beds).boards.length,1);assert.equal(materialList(s.beds).poles,8);assert.deepEqual([...new Set(members(s.beds[0]).filter(m=>m.kind==='rail').map(m=>m.a[1]+4))],[120]);assert.throws(()=>nextLayout(s,{type:'shelf-level',id:'s',delta:-1}));s=nextLayout(s,{type:'shelf-level',id:'s',delta:1});assert.equal(s.beds[0].upper,120);assert.equal(materialList(s.beds).boards.length,2)});

test('changing tent width and length recalculates walls and entrance clearance',()=>{
 const b=bed({x:136}),larger={...DEFAULT_TENT,width:600,length:700};
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
 assert.equal(mastCollisions(bed({x:48,z:350}),tent).length,1);
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
 const custom={beds:[bed()],selected:'a',tent:{width:600,length:700,wallHeight:200,ridgeHeight:300},construction:{...DEFAULT_CONSTRUCTION}};
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
 assert.deepEqual(nextLayout(original,{type:'reset'}),{beds:[],selected:null,tent:{...DEFAULT_TENT},construction:{...DEFAULT_CONSTRUCTION}});
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

import {splitMember} from '../app/model.ts';
test('6 cm notches extend 3 cm beyond each axis: 81 and 191 cm beams',()=>{
 const b={id:'a',levels:2,...defaults};
 assert.deepEqual(materialList([b]).rows.filter(r=>r.kind==='rail').map(r=>[r.length,r.diameter,r.count]),[[81,8,4],[191,8,4]]);
 const longer={...DEFAULT_CONSTRUCTION,notchLength:8};
 assert.deepEqual(materialList([b],longer).rows.filter(r=>r.kind==='rail').map(r=>r.length),[83,193]);
 approx(materialList([b],longer).meters-materialList([b]).meters,.16);
});
test('global diameter and end length independently control thickness, beam length and physical bounds',()=>{
 const b=bed({z:0}),construction={poleDiameter:12,notchLength:9};
 assert.ok(members(b,construction).every(p=>p.radius===6));
 assert.deepEqual(materialList([b],construction).rows.filter(r=>r.kind==='rail').map(r=>r.length),[89,189]);
 assert.deepEqual(bounds(b,construction),{minX:-46,maxX:46,minZ:-96,maxZ:96});
 assert.deepEqual(bounds({...b,rotation:90},construction),{minX:-96,maxX:96,minZ:-46,maxZ:46});
 assert.deepEqual(bounds(b,{...construction,notchLength:18}),{minX:-49,maxX:49,minZ:-99,maxZ:99});
 assert.equal(roofCollision(bed({x:132,upper:175}),DEFAULT_TENT,construction),true);
 assert.ok(collisions([bed({x:136})],DEFAULT_TENT,construction).a.some(e=>e.includes('20 cm')));
 assert.equal(mastCollisions(bed({x:50,z:0}),DEFAULT_TENT,construction).length,1);
 const post=members(b,construction).find(p=>p.kind==='post');
 assert.deepEqual(splitMember(post).filter(p=>p.radius===4.5).map(p=>[p.a[1],p.b[1]]),[[38,50],[138,150]]);
});
test('joining under global diameter keeps end overlaps separate and merges only shared members',()=>{
 const construction={poleDiameter:12,notchLength:9};
 for(const rotation of [0,90]){
  const a=bed({rotation}),b=bed({id:'b',rotation});
  const joined=nextLayout({beds:[a,b],selected:'b',construction},{type:'join',id:'b',targetId:'a',side:'right'});
  assert.equal(connected(...joined.beds,construction),true);
  assert.equal(materialList(joined.beds,construction).saved,4);
  assert.equal(materialList(joined.beds,construction).poles,20);
 }
});
test('global changes update every bed and shelf, including models added later',()=>{
 const original={beds:[bed(),shelf()],selected:'a'};
 const changed=nextLayout(original,{type:'update-construction',patch:{poleDiameter:10,notchLength:7}});
 assert.equal(changed.beds,original.beds);
 assert.ok(assembly(changed.beds,changed.construction).every(p=>p.radius===5));
 assert.deepEqual(materialList([changed.beds[0]],changed.construction).rows.filter(r=>r.kind==='rail').map(r=>r.length),[87,187]);
 assert.deepEqual(materialList([changed.beds[1]],changed.construction).rows.filter(r=>r.kind==='rail').map(r=>r.length),[47,87]);
 const added=nextLayout(changed,{type:'add',levels:1});
 const b=added.beds.at(-1);
 assert.equal(b.poleDiameter,undefined);assert.equal(b.notchLength,undefined);
 assert.ok(members(b,added.construction).every(p=>p.radius===5));
 assert.deepEqual(materialList([b],added.construction).rows.filter(r=>r.kind==='rail').map(r=>r.length),[82,192]);
 assert.throws(()=>nextLayout(original,{type:'update',id:'a',patch:{poleDiameter:10}}));
});
test('global parameters survive save/load and legacy projects restore defaults',()=>{
 const original={beds:[bed()],selected:'a'};
 const changed=nextLayout(original,{type:'update-construction',patch:{poleDiameter:10,notchLength:7}});
 const loaded=nextLayout(original,{type:'load',layout:JSON.parse(JSON.stringify(changed))});
 assert.deepEqual(loaded.construction,{...DEFAULT_CONSTRUCTION,poleDiameter:10,notchLength:7});
 assert.deepEqual(nextLayout(changed,{type:'load',layout:original}).construction,DEFAULT_CONSTRUCTION);
 assert.equal(original.construction,undefined);
 for(const patch of [{poleDiameter:NaN},{poleDiameter:null},{poleDiameter:0},{poleDiameter:31},{notchLength:Infinity},{notchLength:'6'},{notchLength:0},{notchLength:31},{unexpected:8}]){
  assert.throws(()=>nextLayout(original,{type:'update-construction',patch}));
 }
 assert.throws(()=>nextLayout(changed,{type:'load',layout:{...changed,construction:{poleDiameter:NaN,notchLength:6}}}));
 assert.throws(()=>validateConstruction({poleDiameter:8}));
 assert.throws(()=>nextLayout({beds:[bed({levels:1,lower:12})],selected:'a'},{type:'update-construction',patch:{poleDiameter:20}}));
});
test('clear retains global settings and a new project resets them',()=>{
 const original={beds:[bed()],selected:'a',construction:{poleDiameter:10,notchLength:7}};
 assert.equal(nextLayout(original,{type:'clear'}).construction,original.construction);
 assert.equal(nextLayout(original,{type:'remove',id:'a'}).construction,original.construction);
 assert.deepEqual(nextLayout(original,{type:'reset'}).construction,DEFAULT_CONSTRUCTION);
});


import {braces,braceAssembly,world} from '../app/model.ts';
test('braces are opt-in and do not affect the main pole list or its diameter',()=>{
 const beds=[bed(),shelf()],construction={...DEFAULT_CONSTRUCTION,braces:true};
 const before=materialList(beds),after=materialList(beds,construction);
 assert.equal(before.braces.count,0);assert.deepEqual(braces(bed()),[]);
 assert.equal(after.braces.count,16);assert.ok(after.braces.meters>0);
 for(const key of ['rows','poles','meters','saved','diameters','joints'])assert.deepEqual(after[key],before[key]);
 assert.ok(after.braces.rows.every(r=>!('diameter' in r)));
 assert.equal(after.braces.rows.reduce((sum,r)=>sum+r.count,0),16);
});
test('eight knee braces fit each model and lengths follow its dimensions and height',()=>{
 const construction={...DEFAULT_CONSTRUCTION,braces:true};
 for(const b of [bed({levels:1,lower:35}),bed(),shelf(),shelf({shelfCount:1})]){
  const supports=braces(b,construction),r=bounds(b,construction),h=Math.max(...members(b).map(m=>m.b[1]));
  assert.equal(supports.length,8);
  for(const p of supports){
   assert.ok(p.b[1]>p.a[1]);assert.ok(p.a[1]>0);assert.ok(p.b[1]<h);
   assert.ok(p.radius<construction.poleDiameter/2);
   for(const point of [p.a,p.b]){const q=world(point,b);assert.ok(q[0]>=r.minX&&q[0]<=r.maxX);assert.ok(q[2]>=r.minZ&&q[2]<=r.maxZ)}
   approx(Math.hypot(p.b[0]-p.a[0],p.b[2]-p.a[2]),p.b[1]-p.a[1]);
  }
 }
 const single=materialList([bed({levels:1,lower:35})],construction),tall=materialList([bed()],construction);
 assert.ok(single.braces.meters<tall.braces.meters);
 assert.deepEqual(collisions([bed()],DEFAULT_TENT,construction),collisions([bed()]));
 assert.ok(parts(bed(),construction).length>parts(bed()).length);
});
test('shared braces count once at connected faces, with rotation and accidental overlaps handled',()=>{
 const construction={...DEFAULT_CONSTRUCTION,braces:true};
 const a=bed({x:-40}),b=bed({id:'b',x:40}),supports=braceAssembly([a,b],construction);
 assert.equal(supports.length,14);assert.equal(supports.filter(p=>p.owners.length===2).length,2);
 for(const rotation of [0,90,180,270]){
  const one=bed({rotation}),actual=braceAssembly([one],construction);
  assert.deepEqual(actual.map(p=>[p.a,p.b]),braces(one,construction).map(p=>[world(p.a,one),world(p.b,one)]));
 }
 assert.equal(braceAssembly([a,{...a,id:'overlap'}],construction).length,16);
});
test('global brace toggle survives save/load, resets and rejects invalid flags',()=>{
 const original={beds:[bed(),shelf()],selected:'a',construction:{...DEFAULT_CONSTRUCTION}};
 const changed=nextLayout(original,{type:'update-construction',patch:{braces:true}});
 assert.equal(changed.beds,original.beds);assert.equal(changed.construction.braces,true);
 const loaded=nextLayout(original,{type:'load',layout:JSON.parse(JSON.stringify(changed))});
 assert.equal(loaded.construction.braces,true);
 assert.equal(nextLayout(changed,{type:'load',layout:{beds:[bed()],selected:'a',construction:{poleDiameter:8,notchLength:6}}}).construction.braces,false);
 assert.equal(nextLayout(changed,{type:'clear'}).construction.braces,true);
 assert.equal(nextLayout(changed,{type:'reset'}).construction.braces,false);
 assert.equal(materialList(changed.beds,nextLayout(changed,{type:'update-construction',patch:{braces:false}}).construction).braces.count,0);
 for(const braces of [1,'true',null])assert.throws(()=>nextLayout(original,{type:'update-construction',patch:{braces}}));
});


test('notches straddle post axes and main diameter does not move those axes',()=>{
 const b={id:'axis-bed',levels:2,...defaults};
 for(const rotation of [0,90,180,270])for(const poleDiameter of [6,8,12]){
  const c={...DEFAULT_CONSTRUCTION,poleDiameter},all=members({...b,rotation},c),posts=all.filter(p=>p.kind==='post');
  assert.deepEqual([...new Set(posts.map(p=>p.a[0]))],[-37.5,37.5]);
  assert.deepEqual([...new Set(posts.map(p=>p.a[2]))],[-92.5,92.5]);
  for(const rail of all.filter(p=>p.kind==='rail')){
   const axis=rail.a[0]===rail.b[0]?2:0,other=axis===0?2:0;
   const ends=posts.filter(p=>p.a[other]===rail.a[other]).sort((p,q)=>p.a[axis]-q.a[axis]);
   approx(ends[0].a[axis]-rail.a[axis],3);approx(rail.b[axis]-ends[1].a[axis],3);
  }
  assert.deepEqual(materialList([{...b,rotation}],c).rows.filter(r=>r.kind==='rail').map(r=>r.length),[81,191]);
 }
});
test('global mattress changes resize all beds but preserve shelves, levels, positions and selection',()=>{
 const original={beds:[bed(),bed({id:'b',rotation:90,levels:1}),shelf()],selected:'b',construction:{...DEFAULT_CONSTRUCTION,braces:true}};
 const next=nextLayout(original,{type:'update-construction',patch:{mattressWidth:75,mattressLength:180}});
 assert.deepEqual(original.beds[0].width,80);
 assert.equal(next.beds[2],original.beds[2]);assert.equal(next.selected,'b');
 for(let i=0;i<2;i++)assert.deepEqual(next.beds[i],{...original.beds[i],width:75,length:180});
 assert.deepEqual(materialList([next.beds[0]],next.construction).rows.filter(r=>r.kind==='rail').map(r=>r.length),[81,186]);
 assert.equal(next.construction.braces,true);
 const newBed=nextLayout(next,{type:'add',levels:2}).beds.at(-1);
 assert.deepEqual([newBed.width,newBed.length],[75,180]);
 const newShelf=nextLayout(next,{type:'add',kind:'shelf',levels:3}).beds.at(-1);
 assert.deepEqual([newShelf.width,newShelf.length],[90,30]);
 const lengthOnly=nextLayout(original,{type:'update-construction',patch:{mattressLength:180}});
 assert.equal(lengthOnly.beds[0].width,80);assert.equal(lengthOnly.beds[0].length,180);
});
test('mattress settings save and load, default for legacy projects, survive clear and reset',()=>{
 const original={beds:[bed()],selected:'a'};
 const custom=nextLayout(original,{type:'update-construction',patch:{mattressWidth:70,mattressLength:180}});
 assert.deepEqual(nextLayout(original,{type:'load',layout:JSON.parse(JSON.stringify(custom))}),{...custom,tent:{...DEFAULT_TENT}});
 const legacy=nextLayout(custom,{type:'load',layout:{...original,construction:{poleDiameter:10,notchLength:7,braces:true}}});
 assert.deepEqual([legacy.construction.mattressWidth,legacy.construction.mattressLength],[75,185]);
 assert.deepEqual(legacy.beds,original.beds);
 assert.equal(nextLayout(custom,{type:'clear'}).construction,custom.construction);
 assert.deepEqual(nextLayout(custom,{type:'reset'}).construction,DEFAULT_CONSTRUCTION);
});
test('invalid mattress settings reject the entire edit without changing existing models',()=>{
 const original={beds:[bed(),shelf()],selected:'a',construction:{...DEFAULT_CONSTRUCTION}};
 const snapshot=JSON.stringify(original);
 for(const patch of [{mattressLength:NaN},{mattressWidth:null},{mattressLength:'180'},{mattressWidth:39},{mattressWidth:251},{mattressLength:99},{mattressLength:251}])assert.throws(()=>nextLayout(original,{type:'update-construction',patch}));
 assert.equal(JSON.stringify(original),snapshot);
 assert.throws(()=>nextLayout(original,{type:'load',layout:{...original,construction:{...DEFAULT_CONSTRUCTION,mattressLength:null}}}));
});

import {surfaceBounds} from '../app/model.ts';
test('end-to-end beds retain one middle crossbar at both sleeping levels',()=>{
 const beds=[{id:'left',levels:2,...defaults,x:-120,z:-92.5},{id:'right',levels:2,...defaults,x:-120,z:92.5}];
 const all=assembly(beds),middle=all.filter(m=>m.kind==='rail'&&m.owners.length===2);
 assert.equal(middle.length,2);
 assert.deepEqual(middle.map(m=>m.a[1]+4),[35,120]);
 for(const rail of middle){approx(rail.a[2],0);approx(rail.b[2],0);approx(rail.b[0]-rail.a[0],81)}
 const rows=materialList(beds).rows;
 assert.deepEqual(rows.filter(r=>r.kind==='rail').map(r=>[r.length,r.count]),[[81,6],[191,8]]);
 for(const h of [35,120]){
  const left=surfaceBounds(beds[0],h,all),right=surfaceBounds(beds[1],h,all);
  approx(left.maxZ,88.5);approx(right.minZ,-88.5);
  approx(beds[1].z+right.minZ-(beds[0].z+left.maxZ),8);
 }
 assert.deepEqual(materialList(beds).fabrics.map(f=>[f.width,f.length]),[[75,185],[75,185],[75,185],[75,185]]);
});
test('shared crossbars remain visible after rotation and with an edited pole diameter',()=>{
 const construction={...DEFAULT_CONSTRUCTION,poleDiameter:12,notchLength:9};
 for(const rotation of [0,90,180,270]){
  const centers=[-92.5,92.5].map(z=>world([0,0,z],{x:0,z:0,rotation}));
  const beds=centers.map((p,i)=>({id:String(i),levels:2,...defaults,x:p[0],z:p[2],rotation})),all=assembly(beds,construction);
  assert.equal(all.filter(m=>m.kind==='rail'&&m.owners.length===2).length,2);
  approx(surfaceBounds(beds[0],120,all,construction).maxZ,86.5);
  approx(surfaceBounds(beds[1],35,all,construction).minZ,-86.5);
  assert.deepEqual(materialList(beds,construction).rows.filter(r=>r.kind==='rail').map(r=>[r.length,r.count]),[[84,6],[194,8]]);
 }
});
test('only shared levels reveal beams and separating a bed restores its full surface outline',()=>{
 const beds=[{id:'a',levels:2,...defaults,z:-92.5},{id:'b',levels:2,...defaults,z:92.5,upper:150}],all=assembly(beds);
 assert.equal(all.filter(m=>m.kind==='rail'&&m.owners.length===2).length,1);
 approx(surfaceBounds(beds[0],35,all).maxZ,88.5);
 approx(surfaceBounds(beds[0],120,all).maxZ,92.5);
 approx(surfaceBounds(beds[1],150,all).minZ,-92.5);
 const separated=[beds[0],{...beds[1],z:200}],detached=assembly(separated);
 assert.equal(detached.filter(m=>m.kind==='rail'&&m.owners.length===2).length,0);
 assert.deepEqual(surfaceBounds(beds[0],35,detached),{minX:-37.5,maxX:37.5,minZ:-92.5,maxZ:92.5});
});
test('long-side connections expose the shared longitudinal rail without adding duplicates',()=>{
 const beds=[{id:'a',levels:2,...defaults,x:-37.5},{id:'b',levels:2,...defaults,x:37.5}],all=assembly(beds);
 for(const h of [35,120]){approx(surfaceBounds(beds[0],h,all).maxX,33.5);approx(surfaceBounds(beds[1],h,all).minX,-33.5)}
 assert.deepEqual(materialList(beds).rows.filter(r=>r.kind==='rail').map(r=>[r.length,r.count]),[[81,8],[191,6]]);
});


test('shelf boards keep their full outline when a shared rail is exposed on the adjacent bed',()=>{
 const beds=[bed({x:-40,upper:120,lower:30}),shelf({x:40})],all=assembly(beds);
 assert.ok(all.some(m=>m.kind==='rail'&&m.owners.length>1));
 assert.deepEqual(surfaceBounds(beds[1],120,all),{minX:-40,maxX:40,minZ:-20,maxZ:20});
 assert.deepEqual(materialList(beds).boards[0],{width:80,length:40});
});
