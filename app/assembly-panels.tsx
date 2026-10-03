'use client';
import {useState} from 'react';
import {Link2, Package} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import {connected,materialList,clearance,type Bed} from './model';
import {dispatch} from './store';
const fmt=(n:number)=>n.toLocaleString('pl-PL',{maximumFractionDigits:2});
export function Connections({beds,selected}:{beds:Bed[];selected:Bed}){
 const links=beds.filter(b=>connected(selected,b));
 const candidates=beds.filter(b=>b.id!==selected.id&&!connected(selected,b)&&b.rotation%180===selected.rotation%180&&Math.abs(b.length-selected.length)<1e-6);
 return <section className="connection-panel"><div className="section-label"><Link2 size={16}/>Łączenie prycz</div>{links.length>0?<p className="connected-label">Połączona z: {links.map(b=>`prycza ${beds.indexOf(b)+1}`).join(', ')}. Wspólne elementy liczymy raz.</p>:<p className="field-note">Dosuń długie boki równoległych prycz. Po puszczeniu konstrukcje wskoczą na wspólne słupki.</p>}{candidates.map(b=><Button key={b.id} variant="outline" className="join-button" onClick={()=>dispatch({type:'join',id:selected.id,targetId:b.id})}><Link2 size={14}/>Połącz z pryczą {beds.indexOf(b)+1}</Button>)}<p className="field-note">Wymagana ta sama długość i równoległe ustawienie. Na styku słupki sięgają najwyższego posłania. Odsunięcie lub zmiana dopasowania rozłącza prycze.</p><div className="clearance-readout">Najbliższy brzeg: <b>{fmt(clearance(selected))} cm</b><span>Wymagane minimum: 40 cm</span></div></section>
}
export function Materials({beds,invalid}:{beds:Bed[];invalid:boolean}){
 const m=materialList(beds),[rope,setRope]=useState(2);
 const cloth=new Map<string,number>();m.fabrics.forEach(f=>{const key=`${fmt(f.width)} × ${fmt(f.length)} cm`;cloth.set(key,(cloth.get(key)||0)+1)});
 return <section className="materials-panel"><div className="section-label"><Package size={17}/>Materiały — cały projekt</div>{!beds.length?<p className="field-note">Dodaj prycze, aby zobaczyć zestawienie.</p>:<><div className="material-total"><b>{m.poles} szt.</b><span>żerdzi Ø 8 cm · {fmt(m.meters)} m łącznie</span></div>{m.saved>0&&<p className="connected-label">Wspólne elementy: o {m.saved} szt. mniej.</p>}<Table aria-label="Żerdzie do budowy"><TableHeader><TableRow><TableHead>Element</TableHead><TableHead>Długość</TableHead><TableHead>Szt.</TableHead></TableRow></TableHeader><TableBody>{m.rows.map(r=><TableRow key={`${r.kind}:${r.length}`}><TableCell>{r.kind==='post'?'Pion':'Belka'}</TableCell><TableCell>{fmt(r.length)} cm</TableCell><TableCell>{r.count}</TableCell></TableRow>)}</TableBody></Table><dl><div><dt>Płótno na posłania</dt><dd>{fmt(m.fabricArea)} m²</dd></div>{[...cloth].map(([size,count])=><div key={size}><dt>{size}</dt><dd>{count} szt.</dd></div>)}<div><dt>Złącza na zaciosy</dt><dd>{m.joints} końców belek</dd></div></dl><label className="rope-estimate">Sznur na koniec belki (szacunek)<span><Input aria-label="Metry sznura na koniec belki" type="number" min="0" max="20" step="0.1" value={rope} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0&&n<=20)setRope(n)}}/>m</span></label><div className="rope-total">Sznur z 10% zapasu: <b>{fmt(Math.ceil(m.joints*rope*1.1*10)/10)} m</b></div><p className="field-note">Żerdzie: długości geometryczne modelu, bez zapasu na cięcie. Płótno: bez zakładek. Sznur: założenie {fmt(rope)} m na koniec belki; dopasuj do wiązań. Zestawienie nie obejmuje namiotu, stężeń ani innych elementów niewidocznych w modelu.</p>{invalid&&<p className="material-warning">Projekt ma błędy dopasowania. Ilości dotyczą obecnego układu i zmienią się po korekcie.</p>}</>}</section>
}
