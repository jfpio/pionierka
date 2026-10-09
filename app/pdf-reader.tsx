'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Minus,Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {PDFDocumentLoadingTask,PDFDocumentProxy,RenderTask} from 'pdfjs-dist';

export default function PdfReader({url}:{url:string}){
  const host=useRef<HTMLDivElement>(null),canvasHost=useRef<HTMLDivElement>(null);
  const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(1),[zoom,setZoom]=useState(1),[width,setWidth]=useState(0),[rendering,setRendering]=useState(true),[error,setError]=useState('');
  useEffect(()=>{
    const element=host.current;if(!element)return;
    const observer=new ResizeObserver(entries=>setWidth(Math.floor(entries[0].contentRect.width)));
    observer.observe(element);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    let active=true,task:PDFDocumentLoadingTask|undefined;
    setPdf(null);setRendering(true);setError('');
    void (async()=>{
      const lib=await import('pdfjs-dist');if(!active)return;
      // Serve the worker unchanged: development transforms require window.
      lib.GlobalWorkerOptions.workerSrc=new URL('./pdf.worker.min.mjs',window.location.href).href;
      task=lib.getDocument({url:new URL(url,window.location.href).href});
      const doc=await task.promise;if(active){setPdf(doc);setPage(1);setZoom(1)}
    })().catch(()=>{if(active){setError('Nie udało się wyświetlić PDF.');setRendering(false)}});
    return()=>{active=false;void task?.destroy().catch(()=>{})};
  },[url]);
  useEffect(()=>{
    if(!pdf||!width)return;
    let active=true,task:RenderTask|undefined;
    setRendering(true);setError('');
    void (async()=>{
      const sheet=await pdf.getPage(page);if(!active)return;
      const natural=sheet.getViewport({scale:1}),viewport=sheet.getViewport({scale:Math.max(100,width-32)/natural.width*zoom});
      const ratio=Math.min(window.devicePixelRatio||1,2),canvas=document.createElement('canvas');
      canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);
      canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
      canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Strona ${page} z ${pdf.numPages} skryptu Orła`);
      task=sheet.render({canvas,viewport,transform:[ratio,0,0,ratio,0,0]});
      await task.promise;
      if(active){canvasHost.current?.replaceChildren(canvas);setRendering(false)}
    })().catch(()=>{if(active){setError('Nie udało się wyświetlić tej strony PDF.');setRendering(false)}});
    return()=>{active=false;task?.cancel()};
  },[pdf,page,zoom,width]);
  return <section className="pdf-reader" aria-label={'Podgląd skryptu "Orła"'}>
    <div className="pdf-toolbar" role="group" aria-label="Sterowanie podglądem PDF">
      <Button variant="outline" size="icon" aria-label="Poprzednia strona PDF" disabled={!pdf||page===1} onClick={()=>setPage(n=>n-1)}><ChevronLeft size={18}/></Button>
      <span aria-live="polite">Strona {page} / {pdf?.numPages??'…'}</span>
      <Button variant="outline" size="icon" aria-label="Następna strona PDF" disabled={!pdf||page===pdf.numPages} onClick={()=>setPage(n=>n+1)}><ChevronRight size={18}/></Button>
      <span className="pdf-toolbar-divider"/>
      <Button variant="outline" size="icon" aria-label="Pomniejsz PDF" disabled={!pdf||zoom<=.5} onClick={()=>setZoom(n=>Math.max(.5,Math.round((n-.25)*100)/100))}><Minus size={18}/></Button>
      <span>{Math.round(zoom*100)}%</span>
      <Button variant="outline" size="icon" aria-label="Powiększ PDF" disabled={!pdf||zoom>=2} onClick={()=>setZoom(n=>Math.min(2,Math.round((n+.25)*100)/100))}><Plus size={18}/></Button>
    </div>
    <div className="pdf-scroll" ref={host} aria-busy={rendering}>
      {rendering&&<p className="pdf-status" role="status">Wczytywanie PDF…</p>}
      {error&&<p className="pdf-status" role="alert">{error} <a href={url} target="_blank" rel="noreferrer">Otwórz PDF w nowej karcie</a></p>}
      <div className="pdf-canvas" ref={canvasHost}/>
    </div>
  </section>;
}
