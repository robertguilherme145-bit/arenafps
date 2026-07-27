import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Mail,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Input, Label } from "../components/ui/Form";
import { PageHeader } from "../components/ui/PageHeader";
import { useToast } from "../hooks/useToast";
import { getPublicPortal, sendPublicContact } from "../services/api";
import type { PublicPortalData } from "../types/api";

const headings = {
  sobre: [
    "Sobre a Arena Camp",
    "Infraestrutura competitiva para transformar partidas em historico confiavel.",
  ],
  contato: [
    "Contato",
    "Fale com a equipe sobre suporte, organizacao, parcerias ou competicoes.",
  ],
  faq: [
    "Perguntas frequentes",
    "Respostas sobre contas, equipes, pagamentos, partidas e rankings.",
  ],
  privacidade: [
    "Politica de Privacidade",
    "Como a Arena Camp trata dados de contas, competicoes e pagamentos.",
  ],
  termos: [
    "Termos de Uso",
    "Regras para uma operacao competitiva justa, segura e auditavel.",
  ],
  noticias: [
    "Noticias",
    "Atualizacoes oficiais, resultados e destaques da comunidade.",
  ],
} as const;

export function StaticPage({ page }: { page: keyof typeof headings }) {
  const [portal, setPortal] = useState<PublicPortalData | null>(null);
  useEffect(() => {
    if (["noticias", "faq", "sobre"].includes(page))
      void getPublicPortal()
        .then(setPortal)
        .catch(() => undefined);
  }, [page]);
  const [title, description] = headings[page];
  return (
    <section className="mx-auto max-w-[1300px] px-4 py-10 lg:px-8">
      <PageHeader
        eyebrow="Arena Camp"
        title={title}
        description={description}
      />
      {page === "noticias" ? (
        <News data={portal} />
      ) : page === "faq" ? (
        <Faq data={portal} />
      ) : page === "contato" ? (
        <Contact />
      ) : page === "sobre" ? (
        <About data={portal} />
      ) : (
        <Legal type={page} />
      )}
    </section>
  );
}

function News({ data }: { data: PublicPortalData | null }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data?.content.news.map((item) => (
        <article
          className="border border-arena-line bg-arena-panel"
          key={item.id}
        >
          {item.image_url ? (
            <img
              className="aspect-video w-full object-cover"
              src={item.image_url}
              alt=""
            />
          ) : null}
          <div className="p-5">
            <p className="text-xs font-semibold uppercase text-cyan-200">
              {formatDate(item.published_at)}
            </p>
            <h2 className="mt-3 font-display text-xl font-bold">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-arena-muted">
              {item.subtitle || item.body}
            </p>
            {item.link_url ? (
              <a
                className="mt-4 inline-block text-sm font-semibold text-cyan-200"
                href={item.link_url}
              >
                Ler publicacao
              </a>
            ) : null}
          </div>
        </article>
      ))}
      {data && !data.content.news.length ? (
        <Empty text="Nenhuma noticia publicada no momento." />
      ) : null}
    </div>
  );
}
function Faq({ data }: { data: PublicPortalData | null }) {
  return (
    <div className="divide-y divide-arena-line border-y border-arena-line">
      {data?.content.faq.map((item) => (
        <details className="py-5" key={item.id}>
          <summary className="cursor-pointer font-semibold">
            {item.title}
          </summary>
          <p className="pt-3 leading-7 text-arena-muted">{item.body}</p>
        </details>
      ))}
    </div>
  );
}
function Contact() {
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  async function submit() {
    setBusy(true);
    try {
      const response = await sendPublicContact(form);
      success("Mensagem enviada", response.mensagem);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (reason) {
      error(
        "Falha ao enviar mensagem",
        reason instanceof Error ? reason.message : "Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
      <div className="border border-cyan-400/30 bg-cyan-400/[.06] p-6">
        <Mail className="h-8 w-8 text-cyan-200" />
        <h2 className="mt-6 font-display text-2xl font-bold">
          Central Arena Camp
        </h2>
        <p className="mt-3 text-sm leading-6 text-arena-muted">
          As mensagens entram diretamente na fila administrativa e recebem
          acompanhamento por status.
        </p>
        <p className="mt-6 text-sm font-semibold">arenafpseventos@gmail.com</p>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Enviar mensagem
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((state) => ({ ...state, name: event.target.value }))
                }
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((state) => ({ ...state, email: event.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Assunto">
            <Input
              value={form.subject}
              onChange={(event) =>
                setForm((state) => ({ ...state, subject: event.target.value }))
              }
            />
          </Field>
          <Field label="Mensagem">
            <textarea
              className="min-h-36 w-full rounded-arena border border-arena-line bg-black/25 p-3 text-sm outline-none focus:border-cyan-400"
              value={form.message}
              onChange={(event) =>
                setForm((state) => ({ ...state, message: event.target.value }))
              }
            />
          </Field>
          <Button
            disabled={
              !form.name || !form.email || !form.subject || !form.message
            }
            loading={busy}
            icon={<Mail className="h-4 w-4" />}
            onClick={() => void submit()}
          >
            Enviar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
function About({ data }: { data: PublicPortalData | null }) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Value
          icon={<Trophy />}
          title="Competicao"
          text="Regras, chaves, mapas, placares e estatisticas em uma operacao auditavel."
        />
        <Value
          icon={<ShieldCheck />}
          title="Confianca"
          text="Permissoes por papel, historico administrativo e dados oficiais por partida."
        />
        <Value
          icon={<CheckCircle2 />}
          title="Carreira"
          text="Cada resultado contribui para rankings, conquistas e historico publico."
        />
      </div>
      <div className="grid grid-cols-2 gap-px border border-arena-line bg-arena-line md:grid-cols-4">
        <Count value={data?.stats.players ?? 0} label="Jogadores" />
        <Count value={data?.stats.teams ?? 0} label="Equipes" />
        <Count value={data?.stats.tournaments ?? 0} label="Torneios" />
        <Count value={data?.stats.matches ?? 0} label="Partidas" />
      </div>
    </div>
  );
}
function Legal({ type }: { type: "privacidade" | "termos" }) {
  const sections =
    type === "privacidade"
      ? [
          [
            "Dados tratados",
            "Cadastro, perfil, vinculos de jogos, participacao competitiva, seguranca e dados necessarios aos pagamentos.",
          ],
          [
            "Finalidades",
            "Autenticacao, operacao de torneios, prevencao a fraude, rankings, suporte e cumprimento de obrigacoes.",
          ],
          [
            "Seus controles",
            "Preferencias de notificacao, privacidade do perfil, sessoes ativas e autenticacao em dois fatores ficam disponiveis na conta.",
          ],
          [
            "Retencao e seguranca",
            "Os registros seguem o tempo necessario para historico competitivo, auditoria, disputas e obrigacoes aplicaveis.",
          ],
        ]
      : [
          [
            "Conta e permissoes",
            "Cada pessoa utiliza uma conta unica. Os recursos disponiveis dependem dos papeis concedidos na plataforma e nas equipes.",
          ],
          [
            "Integridade competitiva",
            "Fraude, manipulacao de resultado, abuso e descumprimento de regulamento podem gerar penalidades e suspensoes.",
          ],
          [
            "Pagamentos e inscricoes",
            "Valores, prazos, cancelamentos e reembolsos seguem as condicoes publicadas em cada torneio.",
          ],
          [
            "Conteudo e evidencias",
            "Materiais enviados em disputas e suporte devem ser verdadeiros, pertinentes e respeitar direitos de terceiros.",
          ],
        ];
  return (
    <div className="space-y-4">
      {sections.map(([title, text]) => (
        <div className="border-b border-arena-line py-5" key={title}>
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <p className="mt-2 max-w-4xl leading-7 text-arena-muted">{text}</p>
        </div>
      ))}
      <p className="pt-4 text-sm text-arena-muted">
        Ultima atualizacao: {new Date().toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
function Value({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="border border-arena-line bg-arena-panel p-6">
      <span className="text-cyan-200">{icon}</span>
      <h2 className="mt-5 font-display text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-arena-muted">{text}</p>
    </div>
  );
}
function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-arena-bg p-6 text-center">
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs uppercase text-arena-muted">{label}</p>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-arena-line p-10 text-center text-arena-muted">
      {text}
    </div>
  );
}
function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "Arena Camp";
}
