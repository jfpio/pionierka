import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Pionierka — projektant obozowy',description:'Zaplanuj układ prycz w namiocie harcerskim. Interaktywny projektant 3D.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pl"><body>{children}</body></html>}
