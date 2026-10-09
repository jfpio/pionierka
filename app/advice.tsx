import {Feather,Download} from 'lucide-react';

const authorUrl='https://www.jakobstaf.pl/o-nas/druzyna-jakobstaf/robert-chalimoniuk';
const pdfUrl='/materialy/pionierka-obozowa-orzel.pdf';

export default function Advice() {
  return <section className="advice-page" aria-label={'Porady pionierkowe "Orła"'}><div className="advice-wrap">
    <header className="advice-hero">
      <div className="advice-kicker"><Feather size={18}/> AGRICOLA 2012</div>
      <h1>Porady pionierkowe <a href={authorUrl} target="_blank" rel="noreferrer">"Orła"</a></h1>
      <p>Poniżej przedstawiamy wam porady "Orła" przygotowane przez niego na Agricolę 2012. Na ich bazie działa "Projektant".</p>
      <a className="pdf-download" href={pdfUrl} download="Pionierka obozowa - Skrypt instruktorski Orzeł.pdf"><Download size={18}/>Pobierz PDF<span>1,8 MB</span></a>
    </header>
    <footer className="advice-foot"><a href={authorUrl} target="_blank" rel="noreferrer">Robert Chalimoniuk "Orzeł"</a><br/>DLA AGRICOLA’12<br/>DO UŻYTKU WEWNĄTRZORGANIZACYJNEGO.</footer>
  </div></section>;
}
