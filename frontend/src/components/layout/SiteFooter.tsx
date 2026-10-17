import { Link } from "react-router-dom";
import { ArenaMark } from "../brand/ArenaMark";
import { PUBLIC_MENU } from "./Navbar";

const INSTITUTIONAL = [
  { label:"Sobre", href:"/sobre" },
  { label:"Perguntas frequentes", href:"/faq" },
  { label:"Contato", href:"/contato" },
  { label:"Privacidade", href:"/privacidade" },
  { label:"Termos de uso", href:"/termos" }
];

export function SiteFooter() {
  return (
    <footer className="border-t border-arena-line bg-arena-panel2 px-4 py-10 lg:px-8">
      <div className="mx-auto grid max-w-[1500px] gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5"><ArenaMark size={26} /><span className="font-display text-lg font-bold">Arena Camp</span></div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-arena-muted">Campeonatos de FPS para equipes e jogadores, do cadastro ao pódio.</p>
        </div>
        <FooterGroup links={[...PUBLIC_MENU]} title="Competição" />
        <FooterGroup links={INSTITUTIONAL} title="Arena Camp" />
      </div>
      <p className="mx-auto mt-8 max-w-[1500px] border-t border-arena-line pt-5 text-xs text-arena-muted">© {new Date().getFullYear()} Arena Camp</p>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <nav aria-label={title}>
      <p className="font-semibold">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => <li key={link.href}><Link className="text-sm text-arena-muted hover:text-arena-text" to={link.href}>{link.label}</Link></li>)}
      </ul>
    </nav>
  );
}
