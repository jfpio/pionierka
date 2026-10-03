export type Bed = { id: string; kind?: 'bed' | 'shelf'; levels: 1 | 2 | 3; middle?: number; width: number; length: number; lower: number; upper: number; x: number; z: number; rotation: number };
export type Point = [number, number, number];
export type Part = { a: Point; b: Point; radius: number };
export type Member = Part & { kind: 'post' | 'rail'; owners: string[]; joints: number[] };
export const defaults = { width: 80, length: 180, lower: 50, upper: 150, x: 0, z: 0, rotation: 0 };
export const EDGE_CLEARANCE = 20;
export const shelfDefaults = {...defaults, width:80,length:40,lower:30,middle:75,upper:120};
export const itemName = (b:Bed) => b.kind === 'shelf' ? 'Regał trzypoziomowy' : b.levels === 1 ? 'Prycza jednopoziomowa' : 'Prycza dwupoziomowa';
const EPS = 1e-6;
export const heights = (b: Bed) => b.levels === 3 ? [b.lower,b.middle!,b.upper] : b.levels === 2 ? [b.lower, b.upper] : [b.lower];
export const top = (b: Bed) => b.levels > 1 ? b.upper : b.lower;

export function members(b: Bed): Member[] {
  const out: Member[] = [];
  for (const x of [-b.width / 2 - 4, b.width / 2 + 4]) {
    for (const z of [-b.length / 2 - 4, b.length / 2 + 4]) {
      out.push({ a: [x, 0, z], b: [x, top(b), z], radius: 4, kind: 'post', owners: [b.id], joints: heights(b) });
    }
  }
  for (const h of heights(b)) {
    for (const x of [-b.width / 2 - 4, b.width / 2 + 4]) {
      out.push({ a: [x, h - 4, -b.length / 2 - 4], b: [x, h - 4, b.length / 2 + 4], radius: 4, kind: 'rail', owners: [b.id], joints: [] });
    }
    for (const z of [-b.length / 2 - 4, b.length / 2 + 4]) {
      out.push({ a: [-b.width / 2 - 4, h - 4, z], b: [b.width / 2 + 4, h - 4, z], radius: 4, kind: 'rail', owners: [b.id], joints: [] });
    }
  }
  return out;
}
export function splitMember(m: Member): Part[] {
  if (m.kind === 'rail') return [m];
  const cuts = [...new Set([0, m.b[1], ...m.joints.flatMap(h => [h - 8, h])])].filter(y => y >= 0 && y <= m.b[1]).sort((a, b) => a - b);
  return cuts.slice(1).map((y, i) => ({ a: [m.a[0], cuts[i], m.a[2]], b: [m.a[0], y, m.a[2]], radius: m.joints.some(h => (cuts[i] + y) / 2 >= h - 8 && (cuts[i] + y) / 2 <= h) ? 3 : 4 }));
}
export function parts(b: Bed): Part[] { return members(b).flatMap(splitMember); }
export function world(p: Point, b: Bed): Point {
  const t = b.rotation * Math.PI / 180;
  return [b.x + p[0] * Math.cos(t) + p[2] * Math.sin(t), p[1], b.z - p[0] * Math.sin(t) + p[2] * Math.cos(t)];
}
export function bounds(b: Bed) {
  const turned = b.rotation % 180 !== 0;
  return { minX: b.x - ((turned ? b.length : b.width) + 16) / 2, maxX: b.x + ((turned ? b.length : b.width) + 16) / 2, minZ: b.z - ((turned ? b.width : b.length) + 16) / 2, maxZ: b.z + ((turned ? b.width : b.length) + 16) / 2 };
}
export function clearance(b: Bed) { const r = bounds(b); return Math.min(r.minX + 200, 200 - r.maxX, r.minZ + 250); }
export function connected(a: Bed, b: Bed) {
 if(a.id===b.id)return false;
 const p=bounds(a),q=bounds(b);
 const overlapX=Math.min(p.maxX,q.maxX)-Math.max(p.minX,q.minX);
 const overlapZ=Math.min(p.maxZ,q.maxZ)-Math.max(p.minZ,q.minZ);
 return (Math.abs(overlapX-8)<EPS && overlapZ>8+EPS) || (Math.abs(overlapZ-8)<EPS && overlapX>8+EPS);
}
export function connectionPairs(beds: Bed[]) { return beds.flatMap((a, i) => beds.slice(i + 1).filter(b => connected(a, b)).map(b => [a.id, b.id] as [string, string])); }

// Merge only actual joints between compatible neighbours; an accidental overlap never reduces the material count.
export function assembly(beds: Bed[]): Member[] {
  const byId = new Map(beds.map(b => [b.id, b]));
  const result: Member[] = [];
  const same = (p: Point, q: Point) => p.every((n, i) => Math.abs(n - q[i]) < EPS);
  for (const b of beds) for (const local of members(b)) {
    const m = { ...local, a: world(local.a, b), b: world(local.b, b), owners: [...local.owners], joints: [...local.joints] };
    for(let i=result.length-1;i>=0;i--){
      const o=result[i];
      if(o.kind!==m.kind || !o.owners.some(id=>m.owners.some(other=>connected(byId.get(id)!,byId.get(other)!))))continue;
      if(m.kind==='post'){
        if(!same(o.a,m.a))continue;
        m.b[1]=Math.max(m.b[1],o.b[1]);m.joints=[...new Set([...m.joints,...o.joints])];
      }else{
        const axis=Math.abs(m.b[0]-m.a[0])>EPS?0:2;
        if(![0,1,2].filter(k=>k!==axis).every(k=>Math.abs(o.a[k]-m.a[k])<EPS&&Math.abs(o.b[k]-m.a[k])<EPS))continue;
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
export function roofCollision(b: Bed) {
  return parts(b).some(p => {
    const a = world(p.a, b), c = world(p.b, b), d = c.map((v, i) => v - a[i]), len = Math.hypot(...d), u = d.map(v => v / len);
    return [-1, 1].some(sign => {
      const n = [sign * .45, 1, 0], dot = (v: number[]) => v.reduce((s, x, i) => s + x * n[i], 0);
      const radial = p.radius * Math.sqrt(Math.max(0, 1.2025 - dot(u) ** 2));
      return Math.max(dot(a), dot(c)) + radial >= 250 - EPS;
    });
  });
}
export function collisions(beds: Bed[]) {
  const result: Record<string, string[]> = {};
  for (const b of beds) {
    const box = bounds(b), errors: string[] = [], gap = clearance(b);
    if (Math.min(gap,250-box.maxZ) < -EPS) errors.push('Konstrukcja wychodzi poza obrys namiotu.');
    if (gap < EDGE_CLEARANCE - EPS) errors.push('Za blisko ściany bocznej lub tylnej — wymagane 20 cm.');
    if (roofCollision(b)) errors.push('Konstrukcja dotyka lub przecina dach namiotu.');
    for (const other of beds) {
      if (other.id === b.id || connected(b, other)) continue;
      const o = bounds(other);
      if (box.minX < o.maxX - EPS && box.maxX > o.minX + EPS && box.minZ < o.maxZ - EPS && box.maxZ > o.minZ + EPS) { errors.push('Konstrukcja nakłada się na inny obiekt.'); break; }
    }
    result[b.id] = errors;
  }
  return result;
}
export function materialList(beds: Bed[]) {
  const all = assembly(beds), rows = new Map<string, { kind: 'post' | 'rail'; length: number; count: number }>();
  for (const p of all) {
    const length = Math.round(Math.hypot(...p.b.map((v, i) => v - p.a[i])) * 1000) / 1000, key = `${p.kind}:${length}`;
    const row = rows.get(key);
    if (row) row.count++; else rows.set(key, { kind: p.kind, length, count: 1 });
  }
  const fabrics = beds.filter(b=>b.kind!=='shelf').flatMap(b => heights(b).map(() => ({ width: b.width, length: b.length })));
  return {
    rows: [...rows.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.length - b.length),
    poles: all.length,
    meters: all.reduce((n, p) => n + Math.hypot(...p.b.map((v, i) => v - p.a[i])) / 100, 0),
    saved: beds.reduce((n, b) => n + members(b).length, 0) - all.length,
    boards: beds.filter(b=>b.kind==='shelf').flatMap(b=>heights(b).map(()=>({width:b.width,length:b.length}))),
    fabrics,
    fabricArea: fabrics.reduce((n, f) => n + f.width * f.length / 10000, 0),
    joints: all.filter(p => p.kind === 'rail').length * 2,
  };
}
export function validate(b: Bed) {
  if (b.kind==='shelf' ? b.levels!==3 : b.levels!==1&&b.levels!==2) throw Error('Wybierz 1 lub 2 poziomy.');
  for (const k of ['width', 'length', 'lower', 'upper', 'x', 'z', 'rotation'] as const) if (typeof b[k] !== 'number' || !Number.isFinite(b[k])) throw Error('Wpisz poprawną liczbę.');
  if (b.width < 40 || b.width > 250 || b.length < 20 || b.length > 400) throw Error('Szerokość: 40–250 cm. Długość: 20–400 cm.');
  if (b.lower < 12 || b.lower > 280 || b.upper < 12 || b.upper > 280) throw Error('Wysokość posłania: 12–280 cm.');
  if (b.levels > 1 && b.upper < b.lower + 10) throw Error('Górne posłanie musi być co najmniej 10 cm nad dolnym.');
  if(b.levels===3&&(!Number.isFinite(b.middle)||b.middle!<b.lower+10||b.middle!>b.upper-10))throw Error('Środkowa półka musi być co najmniej 10 cm od sąsiednich poziomów.');
  if (Math.abs(b.x) > 1000 || Math.abs(b.z) > 1000) throw Error('Pozycja musi mieścić się w zakresie −1000–1000 cm.');
  if (![0, 90, 180, 270].includes(b.rotation)) throw Error('Obrót musi wynosić 0°, 90°, 180° lub 270°.');
  return b;
}
export type JoinSide='left'|'right'|'back'|'front';
function joinCandidates(b:Bed, other:Bed, side?:JoinSide){
 const a=bounds({...b,x:0,z:0}),o=bounds(other),xs=[o.minX-a.minX,o.maxX-a.maxX],zs=[o.minZ-a.minZ,o.maxZ-a.maxZ];
 return ([['left',o.minX-a.maxX+8,zs],['right',o.maxX-a.minX-8,zs],['back',o.minZ-a.maxZ+8,xs],['front',o.maxZ-a.minZ-8,xs]] as [JoinSide,number,number[]][]).filter(([s])=>!side||side===s).flatMap(([s,fixed,positions])=>positions.map(p=>({...b,x:s==='left'||s==='right'?fixed:p,z:s==='left'||s==='right'?p:fixed})));
}
export function snapBed(beds: Bed[], id: string, targetId?: string, side?:JoinSide) {
  const b = beds.find(b => b.id === id)!;
  let options = beds.filter(other => other.id !== id && (!targetId || other.id === targetId)).flatMap(other => joinCandidates(b, other, side));
  if (!targetId) options = options.filter(c => Math.hypot(c.x - b.x, c.z - b.z) <= 12);
  options.sort((a, c) => {
    const score = (candidate: Bed) => collisions(beds.map(v => v.id === id ? candidate : v))[id].length * 100000 + Math.hypot(candidate.x - b.x, candidate.z - b.z);
    return score(a) - score(c);
  });
  if (targetId && !options.length) throw Error('Nie znaleziono konstrukcji do połączenia.');
  return options[0] || b;
}
export type Layout = { beds: Bed[]; selected: string | null };
export type Action = { type: 'add'; levels: 1 | 2 | 3; kind?:'bed'|'shelf' } | { type: 'update'; id: string; patch: Partial<Bed> } | { type: 'remove'; id: string } | { type: 'select'; id: string | null } | { type: 'join'; id: string; targetId: string; side?:JoinSide } | { type: 'snap'; id: string };
export function nextLayout(state: Layout, action: Action): Layout {
  if (action.type === 'select') { if (action.id && !state.beds.some(b => b.id === action.id)) throw Error('Nie znaleziono pryczy.'); return { ...state, selected: action.id }; }
  if (action.type === 'add') {
    let b: Bed = validate({ id: crypto.randomUUID(), levels: action.levels, kind:action.kind, ...(action.kind==='shelf'?shelfDefaults:defaults) }), found = false;
    for (let z = -120; z <= 120 && !found; z += 10) for (let x = -120; x <= 120 && !found; x += 10) {
      const candidate = { ...b, x, z };
      if (collisions([...state.beds, candidate])[b.id].length === 0) { b = candidate; found = true; }
    }
    return { beds: [...state.beds, b], selected: b.id };
  }
  if (!state.beds.some(b => b.id === action.id)) throw Error('Nie znaleziono pryczy.');
  if (action.type === 'remove') return { beds: state.beds.filter(b => b.id !== action.id), selected: state.selected === action.id ? null : state.selected };
  if (action.type === 'join' || action.type === 'snap') {
    if (action.type === 'join' && (action.targetId === action.id || !state.beds.some(b => b.id === action.targetId))) throw Error('Wybierz inną pryczę.');
    const snapped = validate(snapBed(state.beds, action.id, action.type === 'join' ? action.targetId : undefined, action.type === 'join' ? action.side : undefined));
    return { ...state, beds: state.beds.map(b => b.id === action.id ? snapped : b) };
  }
  const allowed = ['middle', 'width', 'length', 'lower', 'upper', 'x', 'z', 'rotation'];
  if (Object.keys(action.patch).some(k => !allowed.includes(k))) throw Error('Nieznany parametr pryczy.');
  return { ...state, beds: state.beds.map(b => b.id === action.id ? validate({ ...b, ...action.patch }) : b) };
}

