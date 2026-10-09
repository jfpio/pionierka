export type Bed = { id: string; kind?: 'bed' | 'shelf'; levels: 1 | 2 | 3; middle?: number; shelfCount?: number; width: number; length: number; lower: number; upper: number; x: number; z: number; rotation: number };
export type Point = [number, number, number];
export type Part = { a: Point; b: Point; radius: number };
export type Member = Part & { kind: 'post' | 'rail'; owners: string[]; joints: number[] };
export type Brace = Part & {kind:'brace';owners:string[]};
export const defaults = { width: 75, length: 185, lower: 35, upper: 120, x: 0, z: 0, rotation: 0 };
export type Construction = { poleDiameter: number; notchLength: number; braces?: boolean };
export const DEFAULT_CONSTRUCTION: Readonly<Construction> = Object.freeze({poleDiameter:8,notchLength:6,braces:false});
export const poleDiameter = (construction: Construction = DEFAULT_CONSTRUCTION) => construction.poleDiameter;
export const notchLength = (construction: Construction = DEFAULT_CONSTRUCTION) => construction.notchLength;
export const envelope = (construction: Construction = DEFAULT_CONSTRUCTION) => Math.max(construction.poleDiameter, construction.notchLength);
export function validateConstruction(construction: Construction): Construction {
  if (!Number.isFinite(construction?.poleDiameter) || construction.poleDiameter < 2 || construction.poleDiameter > 30) throw Error('Średnica żerdzi: 2–30 cm.');
  if (!Number.isFinite(construction?.notchLength) || construction.notchLength < 1 || construction.notchLength > 30) throw Error('Długość zaciosa: 1–30 cm.');
  if (construction.braces !== undefined && typeof construction.braces !== 'boolean') throw Error('Zastrzały: wybierz włączone lub wyłączone.');
  return {poleDiameter:construction.poleDiameter,notchLength:construction.notchLength,braces:construction.braces??false};
}
export type Tent = { width: number; length: number; wallHeight: number; ridgeHeight: number };
export const DEFAULT_TENT: Readonly<Tent> = Object.freeze({ width: 400, length: 500, wallHeight: 160, ridgeHeight: 250 });
export function validateTent(tent: Tent): Tent {
  for (const key of ['width', 'length', 'wallHeight', 'ridgeHeight'] as const) {
    if (!Number.isFinite(tent?.[key])) throw Error('Wpisz poprawne wymiary namiotu.');
  }
  if (tent.width < 100 || tent.width > 2000 || tent.length < 100 || tent.length > 2000) throw Error('Szerokość i długość namiotu: 100–2000 cm.');
  if (tent.wallHeight < 50 || tent.wallHeight > 1000 || tent.ridgeHeight < 50 || tent.ridgeHeight > 1000) throw Error('Wysokości namiotu: 50–1000 cm.');
  if (tent.ridgeHeight < tent.wallHeight) throw Error('Kalenica nie może być niżej niż ściana.');
  return { width: tent.width, length: tent.length, wallHeight: tent.wallHeight, ridgeHeight: tent.ridgeHeight };
}
export const EDGE_CLEARANCE = 20;
export const MAST_RADIUS=4;
export const tentMasts=(tent: Tent = DEFAULT_TENT)=>[{x:0,z:-tent.length/2,name:'tylnym'},{x:0,z:0,name:'środkowym'},{x:0,z:tent.length/2,name:'przy wejściu'}];
export const MASTS=tentMasts();
export function mastCollisions(b:Bed,tent: Tent = DEFAULT_TENT, construction: Construction = DEFAULT_CONSTRUCTION){const r=bounds(b,construction);return tentMasts(tent).filter(m=>Math.hypot(m.x-Math.max(r.minX,Math.min(r.maxX,m.x)),m.z-Math.max(r.minZ,Math.min(r.maxZ,m.z)))<=MAST_RADIUS+1e-6);}
export const shelfDefaults = {...defaults, width:90,length:30,lower:45,middle:90,upper:135};
export const itemName = (b:Bed) => b.kind === 'shelf' ? 'Regał' : b.levels === 1 ? 'Prycza jednopoziomowa' : b.levels===2 ? 'Prycza dwupoziomowa' : 'Prycza trzypoziomowa';
const EPS = 1e-6;
export const heights = (b: Bed) => b.kind==='shelf' && b.shelfCount===1 ? [b.upper] : b.kind==='shelf' && b.shelfCount===2 ? [b.lower,b.upper] : b.kind==='shelf' && (b.shelfCount||3)>3 ? Array.from({length:b.shelfCount!},(_,i)=>b.lower+i*(b.upper-b.lower)/(b.shelfCount!-1)) : b.levels === 3 ? [b.lower,b.middle!,b.upper] : b.levels === 2 ? [b.lower, b.upper] : [b.lower];
export const top = (b: Bed) => b.levels > 1 ? b.upper : b.lower;

export function members(b: Bed, construction: Construction = DEFAULT_CONSTRUCTION): Member[] {
  const out: Member[] = [];
  const radius = poleDiameter(construction) / 2, end = notchLength(construction);
  for (const x of [-b.width / 2 - radius, b.width / 2 + radius]) {
    for (const z of [-b.length / 2 - radius, b.length / 2 + radius]) {
      out.push({ a: [x, 0, z], b: [x, top(b), z], radius, kind: 'post', owners: [b.id], joints: heights(b) });
    }
  }
  for (const h of heights(b)) {
    for (const x of [-b.width / 2 - radius, b.width / 2 + radius]) {
      out.push({ a: [x, h - radius, -b.length / 2 - end], b: [x, h - radius, b.length / 2 + end], radius, kind: 'rail', owners: [b.id], joints: [] });
    }
    for (const z of [-b.length / 2 - radius, b.length / 2 + radius]) {
      out.push({ a: [-b.width / 2 - end, h - radius, z], b: [b.width / 2 + end, h - radius, z], radius, kind: 'rail', owners: [b.id], joints: [] });
    }
  }
  return out;
}
export function splitMember(m: Member): Part[] {
  if (m.kind === 'rail') return [m];
  const diameter = 2 * m.radius;
  const cuts = [...new Set([0, m.b[1], ...m.joints.flatMap(h => [h - diameter, h])])].filter(y => y >= 0 && y <= m.b[1]).sort((a, b) => a - b);
  return cuts.slice(1).map((y, i) => ({ a: [m.a[0], cuts[i], m.a[2]], b: [m.a[0], y, m.a[2]], radius: m.joints.some(h => (cuts[i] + y) / 2 >= h - diameter && (cuts[i] + y) / 2 <= h) ? m.radius * .75 : m.radius }));
}
export function braces(b:Bed,construction:Construction=DEFAULT_CONSTRUCTION):Brace[] {
  if(!construction.braces)return [];
  const r=construction.poleDiameter/2,halfX=b.width/2+r,halfZ=b.length/2+r,y=top(b)-r;
  // Display thickness only; the material list deliberately does not specify a brace diameter.
  const radius=Math.min(1,r/2),runX=Math.min(40,2*halfX/3,y-radius),runZ=Math.min(40,2*halfZ/3,y-radius);
  const result:Brace[]=[];
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const x=sx*halfX,z=sz*halfZ;
    result.push({a:[x,y-runX,z],b:[x-sx*runX,y,z],radius,kind:'brace',owners:[b.id]});
    result.push({a:[x,y-runZ,z],b:[x,y,z-sz*runZ],radius,kind:'brace',owners:[b.id]});
  }
  return result;
}
export function parts(b: Bed, construction: Construction = DEFAULT_CONSTRUCTION): Part[] { return [...members(b,construction).flatMap(splitMember),...braces(b,construction)]; }
export function world(p: Point, b: Bed): Point {
  const t = b.rotation * Math.PI / 180;
  return [b.x + p[0] * Math.cos(t) + p[2] * Math.sin(t), p[1], b.z - p[0] * Math.sin(t) + p[2] * Math.cos(t)];
}
export function bounds(b: Bed, construction: Construction = DEFAULT_CONSTRUCTION, extra = envelope(construction)) {
  const turned = b.rotation % 180 !== 0;
  return { minX: b.x - ((turned ? b.length : b.width) / 2 + extra), maxX: b.x + ((turned ? b.length : b.width) / 2 + extra), minZ: b.z - ((turned ? b.width : b.length) / 2 + extra), maxZ: b.z + ((turned ? b.width : b.length) / 2 + extra) };
}
export function clearance(b: Bed, tent: Tent = DEFAULT_TENT, construction: Construction = DEFAULT_CONSTRUCTION) { const r = bounds(b,construction); return Math.min(r.minX + tent.width/2, tent.width/2 - r.maxX, r.minZ + tent.length/2); }
export function connected(a: Bed, b: Bed, construction: Construction = DEFAULT_CONSTRUCTION) {
 const diameter=poleDiameter(construction);
 if(a.id===b.id)return false;
 const p=bounds(a,construction,diameter),q=bounds(b,construction,diameter);
 const overlapX=Math.min(p.maxX,q.maxX)-Math.max(p.minX,q.minX);
 const overlapZ=Math.min(p.maxZ,q.maxZ)-Math.max(p.minZ,q.minZ);
 return (Math.abs(overlapX-diameter)<EPS && overlapZ>diameter+EPS) || (Math.abs(overlapZ-diameter)<EPS && overlapX>diameter+EPS);
}
export function connectionPairs(beds: Bed[], construction: Construction = DEFAULT_CONSTRUCTION) { return beds.flatMap((a, i) => beds.slice(i + 1).filter(b => connected(a, b,construction)).map(b => [a.id, b.id] as [string, string])); }

// Merge only actual joints between compatible neighbours; an accidental overlap never reduces the material count.
export function assembly(beds: Bed[], construction: Construction = DEFAULT_CONSTRUCTION): Member[] {
  const byId = new Map(beds.map(b => [b.id, b]));
  const result: Member[] = [];
  const same = (p: Point, q: Point) => p.every((n, i) => Math.abs(n - q[i]) < EPS);
  for (const b of beds) for (const local of members(b,construction)) {
    const m = { ...local, a: world(local.a, b), b: world(local.b, b), owners: [...local.owners], joints: [...local.joints] };
    for(let i=result.length-1;i>=0;i--){
      const o=result[i];
      if(o.kind!==m.kind || !o.owners.some(id=>m.owners.some(other=>connected(byId.get(id)!,byId.get(other)!,construction))))continue;
      if(m.kind==='post'){
        if(!same(o.a,m.a))continue;
        m.b[1]=Math.max(m.b[1],o.b[1]);m.joints=[...new Set([...m.joints,...o.joints])];
      }else{
        const axis=Math.abs(m.b[0]-m.a[0])>EPS?0:2;
        if(![0,1,2].filter(k=>k!==axis).every(k=>Math.abs(o.a[k]-m.a[k])<EPS&&Math.abs(o.b[k]-m.a[k])<EPS))continue;
        // Overlapping end allowances at a shared post are still two separate beams.
        const sharedSpan=o.owners.some(id=>m.owners.some(other=>{
          const left=byId.get(id)!,right=byId.get(other)!;
          if(!connected(left,right,construction))return false;
          const d=poleDiameter(construction),p=bounds(left,construction,d),q=bounds(right,construction,d);
          return axis===0?Math.min(p.maxX,q.maxX)-Math.max(p.minX,q.minX)>d+EPS:Math.min(p.maxZ,q.maxZ)-Math.max(p.minZ,q.minZ)>d+EPS;
        }));
        if(!sharedSpan)continue;
        const lo=Math.max(Math.min(m.a[axis],m.b[axis]),Math.min(o.a[axis],o.b[axis])),hi=Math.min(Math.max(m.a[axis],m.b[axis]),Math.max(o.a[axis],o.b[axis]));
        if(hi<=lo+EPS)continue;
        const min=Math.min(m.a[axis],m.b[axis],o.a[axis],o.b[axis]),max=Math.max(m.a[axis],m.b[axis],o.a[axis],o.b[axis]);m.a[axis]=min;m.b[axis]=max;
      }
      m.owners=[...new Set([...m.owners,...o.owners])];result.splice(i,1);i=result.length;
    }
    result.push(m);
  }
  return result;
}
export function braceAssembly(beds:Bed[],construction:Construction=DEFAULT_CONSTRUCTION):Brace[] {
  const result:Brace[]=[],byId=new Map(beds.map(b=>[b.id,b]));
  const same=(p:Point,q:Point)=>p.every((n,i)=>Math.abs(n-q[i])<EPS);
  for(const b of beds)for(const brace of braces(b,construction)){
    const a=world(brace.a,b),end=world(brace.b,b);
    const existing=result.find(o=>o.owners.some(id=>connected(byId.get(id)!,b,construction))&&((same(o.a,a)&&same(o.b,end))||(same(o.a,end)&&same(o.b,a))));
    if(existing)existing.owners.push(b.id);
    else result.push({...brace,a,b:end,owners:[b.id]});
  }
  return result;
}
export function roofCollision(b: Bed, tent: Tent = DEFAULT_TENT, construction: Construction = DEFAULT_CONSTRUCTION) {
  const slope = (tent.ridgeHeight - tent.wallHeight) / (tent.width / 2);
  return parts(b,construction).some(p => {
    const a = world(p.a, b), c = world(p.b, b), d = c.map((v, i) => v - a[i]), len = Math.hypot(...d), u = d.map(v => v / len);
    return [-1, 1].some(sign => {
      const n = [sign * slope, 1, 0], dot = (v: number[]) => v.reduce((s, x, i) => s + x * n[i], 0);
      const radial = p.radius * Math.sqrt(Math.max(0, 1 + slope ** 2 - dot(u) ** 2));
      return Math.max(dot(a), dot(c)) + radial >= tent.ridgeHeight - EPS;
    });
  });
}
export function collisions(beds: Bed[], tent: Tent = DEFAULT_TENT, construction: Construction = DEFAULT_CONSTRUCTION) {
  const result: Record<string, string[]> = {};
  for (const b of beds) {
    const box = bounds(b,construction), errors: string[] = [], gap = clearance(b, tent,construction);
    if (Math.min(gap,tent.length/2-box.maxZ) < -EPS) errors.push('Konstrukcja wychodzi poza obrys namiotu.');
    if (gap < EDGE_CLEARANCE - EPS) errors.push('Za blisko ściany bocznej lub tylnej — wymagane 20 cm.');
    for(const mast of mastCollisions(b, tent,construction))errors.push('Konstrukcja koliduje z masztem '+mast.name+'.');
    if (roofCollision(b, tent,construction)) errors.push('Konstrukcja dotyka lub przecina dach namiotu.');
    for (const other of beds) {
      if (other.id === b.id || connected(b, other,construction)) continue;
      const o = bounds(other,construction);
      if (box.minX < o.maxX - EPS && box.maxX > o.minX + EPS && box.minZ < o.maxZ - EPS && box.maxZ > o.minZ + EPS) { errors.push('Konstrukcja nakłada się na inny obiekt.'); break; }
    }
    result[b.id] = errors;
  }
  return result;
}
export function materialList(beds: Bed[], construction: Construction = DEFAULT_CONSTRUCTION) {
  const all = assembly(beds,construction), rows = new Map<string, { kind: 'post' | 'rail'; length: number; diameter: number; count: number }>();
  for (const p of all) {
    const length = Math.round(Math.hypot(...p.b.map((v, i) => v - p.a[i])) * 1000) / 1000, diameter = p.radius * 2, key = `${p.kind}:${diameter}:${length}`;
    const row = rows.get(key);
    if (row) row.count++; else rows.set(key, { kind: p.kind, length, diameter, count: 1 });
  }
  const fabrics = beds.filter(b=>b.kind!=='shelf').flatMap(b => heights(b).map(() => ({ width: b.width, length: b.length })));
  const supports=braceAssembly(beds,construction),braceRows=new Map<number,{length:number;count:number}>();
  for(const p of supports){
    const length=Math.round(Math.hypot(...p.b.map((v,i)=>v-p.a[i]))*1000)/1000;
    const row=braceRows.get(length);
    if(row)row.count++;else braceRows.set(length,{length,count:1});
  }
  return {
    rows: [...rows.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.diameter - b.diameter || a.length - b.length),
    diameters: [...new Set(all.map(p=>p.radius*2))].sort((a,b)=>a-b),
    poles: all.length,
    meters: all.reduce((n, p) => n + Math.hypot(...p.b.map((v, i) => v - p.a[i])) / 100, 0),
    saved: beds.reduce((n, b) => n + members(b,construction).length, 0) - all.length,
    boards: beds.filter(b=>b.kind==='shelf').flatMap(b=>heights(b).map(()=>({width:b.width,length:b.length}))),
    fabrics,
    fabricArea: fabrics.reduce((n, f) => n + f.width * f.length / 10000, 0),
    joints: all.filter(p => p.kind === 'rail').length * 2,
    braces:{rows:[...braceRows.values()].sort((a,b)=>a.length-b.length),count:supports.length,meters:supports.reduce((sum,p)=>sum+Math.hypot(...p.b.map((v,i)=>v-p.a[i]))/100,0)},
  };
}
export function validate(b: Bed, construction: Construction = DEFAULT_CONSTRUCTION) {
  if (b.kind==='shelf' ? b.levels!==3 : ![1,2,3].includes(b.levels)) throw Error('Wybierz 1 lub 2 poziomy.');
  for (const k of ['width', 'length', 'lower', 'upper', 'x', 'z', 'rotation'] as const) if (typeof b[k] !== 'number' || !Number.isFinite(b[k])) throw Error('Wpisz poprawną liczbę.');
  if (b.width < 40 || b.width > 250 || b.length < 20 || b.length > 400) throw Error('Szerokość: 40–250 cm. Długość: 20–400 cm.');
  if (b.lower < 12 || b.lower > 280 || b.upper < 12 || b.upper > 280) throw Error('Wysokość posłania: 12–280 cm.');
  if (heights(b).some(h=>h<poleDiameter(construction))) throw Error('Poziom konstrukcji nie może być niżej niż średnica żerdzi.');
  if (b.levels > 1 && !(b.kind==='shelf'&&b.shelfCount===1) && b.upper < b.lower + 10) throw Error('Górne posłanie musi być co najmniej 10 cm nad dolnym.');
  if(b.levels===3&&(b.kind!=='shelf'||(b.shelfCount||3)===3)&&(!Number.isFinite(b.middle)||b.middle!<b.lower+10||b.middle!>b.upper-10))throw Error('Środkowa półka musi być co najmniej 10 cm od sąsiednich poziomów.');
  if(b.shelfCount!==undefined&&(!Number.isInteger(b.shelfCount)||b.shelfCount<1||b.shelfCount>10||b.kind!=='shelf'||(b.shelfCount>1&&(b.upper-b.lower)/(b.shelfCount-1)<10)))throw Error('Regał: 1–10 poziomów, odstęp minimum 10 cm.');
  if (Math.abs(b.x) > 1000 || Math.abs(b.z) > 1000) throw Error('Pozycja musi mieścić się w zakresie −1000–1000 cm.');
  if (![0, 90, 180, 270].includes(b.rotation)) throw Error('Obrót musi wynosić 0°, 90°, 180° lub 270°.');
  return b;
}
export type JoinSide='left'|'right'|'back'|'front';
function joinCandidates(b:Bed, other:Bed, side:JoinSide|undefined, construction:Construction){
 const diameter=poleDiameter(construction);
 const a=bounds({...b,x:0,z:0},construction,diameter),o=bounds(other,construction,diameter),xs=[o.minX-a.minX,o.maxX-a.maxX],zs=[o.minZ-a.minZ,o.maxZ-a.maxZ];
 return ([['left',o.minX-a.maxX+diameter,zs],['right',o.maxX-a.minX-diameter,zs],['back',o.minZ-a.maxZ+diameter,xs],['front',o.maxZ-a.minZ-diameter,xs]] as [JoinSide,number,number[]][]).filter(([s])=>!side||side===s).flatMap(([s,fixed,positions])=>positions.map(p=>({...b,x:s==='left'||s==='right'?fixed:p,z:s==='left'||s==='right'?p:fixed})));
}
export function snapBed(beds: Bed[], id: string, targetId?: string, side?:JoinSide, tent: Tent = DEFAULT_TENT, construction: Construction = DEFAULT_CONSTRUCTION) {
  const b = beds.find(b => b.id === id)!;
  let options = beds.filter(other => other.id !== id && (!targetId || other.id === targetId)).flatMap(other => joinCandidates(b, other, side,construction));
  if (!targetId) options = options.filter(c => Math.hypot(c.x - b.x, c.z - b.z) <= 12);
  options.sort((a, c) => {
    const score = (candidate: Bed) => collisions(beds.map(v => v.id === id ? candidate : v), tent,construction)[id].length * 100000 + Math.hypot(candidate.x - b.x, candidate.z - b.z);
    return score(a) - score(c);
  });
  if (targetId && !options.length) throw Error('Nie znaleziono konstrukcji do połączenia.');
  return options[0] || b;
}
export type Layout = { beds: Bed[]; selected: string | null; tent?: Tent; construction?: Construction };
export function dropPreview(beds:Bed[],id:string,tent: Tent = DEFAULT_TENT, construction: Construction = DEFAULT_CONSTRUCTION){if(!beds.some(b=>b.id===id))return null;const candidate=snapBed(beds,id,undefined,undefined,tent,construction);const partners=beds.filter(b=>connected(candidate,b,construction));if(!partners.length)return null;const projected=beds.map(b=>b.id===id?candidate:b),issues=collisions(projected,tent,construction);if(issues[id].length||partners.some(b=>issues[b.id].length))return null;return {candidate,ids:[id,...partners.map(b=>b.id)],issues};}
export function joinStatus(beds:Bed[],id:string,targetId:string,side:JoinSide,tent: Tent = DEFAULT_TENT, construction: Construction = DEFAULT_CONSTRUCTION){const candidate=snapBed(beds,id,targetId,side,tent,construction);const errors=collisions(beds.map(b=>b.id===id?candidate:b),tent,construction)[id];return {candidate,errors,valid:errors.length===0};}
export type Action = {type:'update-construction';patch:Partial<Construction>} | {type:'update-tent';patch:Partial<Tent>} | {type:'reset'} | {type:'load';layout:Layout} | {type:'bed-level';id:string;delta:1|-1} | {type:'clear'} | {type:'restore';layout:Layout} | {type:'shelf-level';id:string;delta:1|-1} | { type: 'add'; levels: 1 | 2 | 3; kind?:'bed'|'shelf' } | { type: 'update'; id: string; patch: Partial<Bed> } | { type: 'remove'; id: string } | { type: 'select'; id: string | null } | { type: 'join'; id: string; targetId: string; side?:JoinSide } | { type: 'snap'; id: string };
export function nextLayout(state: Layout, action: Action): Layout {
  const tent = state.tent ?? DEFAULT_TENT;
  const construction = state.construction ?? DEFAULT_CONSTRUCTION;
  if (action.type === 'update-construction') {
    if (Object.keys(action.patch).some(key=>!['poleDiameter','notchLength','braces'].includes(key))) throw Error('Nieznany parametr konstrukcji.');
    const changed=validateConstruction({...construction,...action.patch});
    state.beds.forEach(b=>validate(b,changed));
    return {...state,construction:changed};
  }
  if (action.type === 'update-tent') {
    if (Object.keys(action.patch).some(key => !['width','length','wallHeight','ridgeHeight'].includes(key))) throw Error('Nieznany parametr namiotu.');
    return { ...state, tent: validateTent({ ...tent, ...action.patch }) };
  }
  if (action.type === 'reset') return { beds: [], selected: null, tent: { ...DEFAULT_TENT }, construction: { ...DEFAULT_CONSTRUCTION } };
  if(action.type==='load'){if(!Array.isArray(action.layout?.beds))throw Error('Niepoprawny projekt.');const settings=validateConstruction(action.layout.construction ?? DEFAULT_CONSTRUCTION);action.layout.beds.forEach(b=>validate(b,settings));return {beds:action.layout.beds,selected:action.layout.selected,tent:validateTent(action.layout.tent ?? DEFAULT_TENT),construction:settings};}
  if(action.type==='bed-level'){const b=state.beds.find(v=>v.id===action.id);if(!b||b.kind==='shelf')throw Error('Wybierz pryczę.');let changed:Bed;if(action.delta===1){if(b.levels===3)throw Error('Maksymalnie trzy poziomy.');changed=b.levels===1?{...b,levels:2,upper:b.upper>=b.lower+10?b.upper:b.lower+85}:{...b,levels:3,middle:b.upper,upper:b.upper+(b.upper-b.lower)};}else{if(b.levels===1)throw Error('Prycza musi mieć przynajmniej jeden poziom.');changed=b.levels===3?{...b,levels:2,upper:b.middle,middle:undefined} as Bed:{...b,levels:1};}validate(changed,construction);return {...state,beds:state.beds.map(v=>v.id===b.id?changed:v)};}
  if(action.type==='clear')return {...state,beds:[],selected:null};
  if(action.type==='restore'){action.layout.beds.forEach(b=>validate(b,construction));return {...state,beds:[...state.beds,...action.layout.beds.filter(b=>!state.beds.some(v=>v.id===b.id))],selected:action.layout.selected};}
  if(action.type==='shelf-level'){const b=state.beds.find(b=>b.id===action.id);if(!b||b.kind!=='shelf')throw Error('Wybierz regał.');const changed=validate({...b,shelfCount:(b.shelfCount||3)+action.delta,middle:(b.lower+b.upper)/2},construction);return {...state,beds:state.beds.map(v=>v.id===b.id?changed:v)};}
  if (action.type === 'select') { if (action.id && !state.beds.some(b => b.id === action.id)) throw Error('Nie znaleziono pryczy.'); return { ...state, selected: action.id }; }
  if (action.type === 'add') {
    let b: Bed = validate({ id: crypto.randomUUID(), levels: action.levels, kind:action.kind, ...(action.kind==='shelf'?shelfDefaults:defaults) },construction), found = false;
    const extra=envelope(construction);
    for (let z = -tent.length/2 + EDGE_CLEARANCE + b.length/2+extra; z <= tent.length/2 - b.length/2-extra && !found; z += 10) for (let x = -tent.width/2 + EDGE_CLEARANCE + b.width/2+extra; x <= tent.width/2 - EDGE_CLEARANCE - b.width/2-extra && !found; x += 10) {
      const candidate = { ...b, x, z };
      if (collisions([...state.beds, candidate], tent,construction)[b.id].length === 0) { b = candidate; found = true; }
    }
    return { ...state, beds: [...state.beds, b], selected: b.id };
  }
  if (!state.beds.some(b => b.id === action.id)) throw Error('Nie znaleziono pryczy.');
  if (action.type === 'remove') return { ...state, beds: state.beds.filter(b => b.id !== action.id), selected: state.selected === action.id ? null : state.selected };
  if (action.type === 'join' || action.type === 'snap') {
    if (action.type === 'join' && (action.targetId === action.id || !state.beds.some(b => b.id === action.targetId))) throw Error('Wybierz inną pryczę.');
    const snapped = validate(snapBed(state.beds, action.id, action.type === 'join' ? action.targetId : undefined, action.type === 'join' ? action.side : undefined, tent,construction),construction);
    return { ...state, beds: state.beds.map(b => b.id === action.id ? snapped : b) };
  }
  const allowed = ['middle', 'width', 'length', 'lower', 'upper', 'x', 'z', 'rotation'];
  if (Object.keys(action.patch).some(k => !allowed.includes(k))) throw Error('Nieznany parametr pryczy.');
  return { ...state, beds: state.beds.map(b => b.id === action.id ? validate({ ...b, ...action.patch },construction) : b) };
}
