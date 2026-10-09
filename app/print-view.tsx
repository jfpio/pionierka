import {assembly,surfaceBounds,braceAssembly,DEFAULT_CONSTRUCTION,type Construction,heights,tentMasts,MAST_RADIUS,world,DEFAULT_TENT,type Bed,type Point,type Tent} from './model';

export default function PrintView({beds,view,tent=DEFAULT_TENT,construction=DEFAULT_CONSTRUCTION}:{beds:Bed[];view:'front'|'side'|'iso';tent?:Tent;construction?:Construction}) {
  const w=tent.width/2,l=tent.length/2,all=assembly(beds,construction);
  const floor:Point[]=[[-w,0,-l],[w,0,-l],[w,0,l],[-w,0,l]];
  const wall:Point[]=[[-w,tent.wallHeight,-l],[w,tent.wallHeight,-l],[w,tent.wallHeight,l],[-w,tent.wallHeight,l]];
  const raw=(p:Point)=>view==='front'?[p[0],-p[1]]:view==='side'?[-p[2],-p[1]]:[(p[0]-p[2])*.58,(p[0]+p[2])*.22-p[1]*.9];
  const points=[...floor,...wall,[0,tent.ridgeHeight,-l] as Point,[0,tent.ridgeHeight,l] as Point,...[...all,...braceAssembly(beds,construction)].flatMap(m=>[m.a,m.b]),...beds.map(b=>[b.x,Math.max(...heights(b))+20,b.z] as Point)].map(raw);
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  const scale=Math.min(528/Math.max(1,maxX-minX),378/Math.max(1,maxY-minY));
  const project=(p:Point)=>{const q=raw(p);return [300+(q[0]-(minX+maxX)/2)*scale,225+(q[1]-(minY+maxY)/2)*scale]};
  const line=(a:Point,b:Point,key:string,width=1,color='#a4aba1')=>{const p=project(a),q=project(b);return <line key={key} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={color} strokeWidth={width} strokeLinecap="round"/>};
  return <svg viewBox="0 0 600 450" role="img" aria-label={view==='front'?'Rzut od wejścia':view==='side'?'Rzut z boku':'Minimalistyczna wizualizacja 3D'}>
    {floor.map((p,i)=>line(p,floor[(i+1)%4],'floor'+i))}
    {wall.map((p,i)=><g key={i}>{line(floor[i],p,'wall'+i)}{line(p,wall[(i+1)%4],'edge'+i)}</g>)}
    {[-l,l].map(z=><g key={z}>{line([-w,tent.wallHeight,z],[0,tent.ridgeHeight,z],'roofleft')}{line([0,tent.ridgeHeight,z],[w,tent.wallHeight,z],'roofright')}</g>)}
    {line([0,tent.ridgeHeight,-l],[0,tent.ridgeHeight,l],'ridge')}
    {tentMasts(tent).map((m,i)=>line([m.x,0,m.z],[m.x,tent.ridgeHeight,m.z],'mast'+i,MAST_RADIUS*scale*1.2,'#555'))}
    {beds.flatMap(b=>heights(b).map((h,i)=>{const r=surfaceBounds(b,h,all,construction),corners:Point[]=[[r.minX,h,r.minZ],[r.maxX,h,r.minZ],[r.maxX,h,r.maxZ],[r.minX,h,r.maxZ]];return <polygon key={b.id+i} points={corners.map(p=>project(world(p,b)).join(',')).join(' ')} fill={b.kind==='shelf'?'#d6cbb7':'#bccab5'} fillOpacity=".75" stroke="#616d59" strokeWidth="1"/>}))}
    {[...all,...braceAssembly(beds,construction)].map((m,i)=>line(m.a,m.b,'beam'+i,m.kind==='brace'?1.5:m.radius*scale*1.15,'#6e6252'))}
    {beds.map((b,i)=>{const p=project([b.x,Math.max(...heights(b))+10,b.z]);return <text key={b.id} x={p[0]} y={p[1]} textAnchor="middle" fontSize="17" fill="#222" stroke="white" strokeWidth="3" paintOrder="stroke">{i+1}</text>})}
  </svg>;
}
