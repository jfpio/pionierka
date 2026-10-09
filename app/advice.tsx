import {Download,ExternalLink} from 'lucide-react';
import PdfReader from './pdf-reader';

const authorUrl='https://www.jakobstaf.pl/o-nas/druzyna-jakobstaf/robert-chalimoniuk';
const pdfUrl='./materialy/pionierka-obozowa-orzel.pdf';

export default function Advice() {
  return <section className="advice-page" aria-label={'Porady pionierkowe "Orła"'}><div className="advice-wrap">
    <header className="advice-hero">
      <h1>Porady pionierkowe <a href={authorUrl} target="_blank" rel="noreferrer">"Orła"</a></h1>
      <p>Poniżej przedstawiamy wam porady "Orła" przygotowane przez niego na Agricolę 2012. Na ich bazie działa "Projektant".</p>
      <div className="pdf-actions"><a className="pdf-download" href={pdfUrl} target="_blank" rel="noreferrer"><ExternalLink size={18}/>Otwórz PDF</a>
      <a className="pdf-download pdf-download-secondary" href={pdfUrl} download="Pionierka obozowa - Skrypt instruktorski Orzeł.pdf"><Download size={18}/>Pobierz PDF<span>1,8 MB</span></a></div>
    </header>
    <PdfReader url={pdfUrl}/>
  </div></section>;
}
