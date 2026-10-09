import {Package} from 'lucide-react';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import {materialList,type Bed} from './model';

const fmt=(n:number)=>n.toLocaleString('pl-PL',{maximumFractionDigits:2});

export function Materials({beds,invalid}:{beds:Bed[];invalid:boolean}){
  const m=materialList(beds);
  return <section className="materials-panel">
    <div className="section-label"><Package size={17}/>Materiały — cały projekt</div>
    {!beds.length?<p className="field-note">Dodaj prycze, aby zobaczyć zestawienie.</p>:<>
      <div className="material-total"><b>{m.poles} szt.</b><span>żerdzi Ø 8 cm · {fmt(m.meters)} m łącznie</span></div>
      {m.saved>0&&<p className="connected-label">Wspólne elementy: o {m.saved} szt. mniej.</p>}
      <Table aria-label="Żerdzie do budowy">
        <TableHeader><TableRow><TableHead>Element</TableHead><TableHead>Długość</TableHead><TableHead>Szt.</TableHead></TableRow></TableHeader>
        <TableBody>{m.rows.map(r=><TableRow key={`${r.kind}:${r.length}`}><TableCell>{r.kind==='post'?'Pion':'Belka'}</TableCell><TableCell>{fmt(r.length)} cm</TableCell><TableCell>{r.count}</TableCell></TableRow>)}</TableBody>
      </Table>
      {m.boards.length>0&&<dl>
        <div><dt>Blaty półek (gr. 2,5 cm)</dt><dd>{fmt(m.boards.reduce((n,b)=>n+b.width*b.length/10000,0))} m²</dd></div>
        {m.boards.map((b,i)=><div key={'board'+i}><dt>{fmt(b.width)} × {fmt(b.length)} cm</dt><dd>1 szt.</dd></div>)}
      </dl>}
      {invalid&&<p className="material-warning">Projekt ma błędy dopasowania. Ilości dotyczą obecnego układu i zmienią się po korekcie.</p>}
    </>}
  </section>;
}
