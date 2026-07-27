import { Bell, Check, Download, Save, Search } from "lucide-react";
import { useToast } from "../hooks/useToast";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Input, Label, Select } from "../components/ui/Form";
import { PageHeader } from "../components/ui/PageHeader";

export function DesignSystemPage() {
  const toast = useToast();

  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader eyebrow="Design System" title="Arena UI Kit" description="Tokens, componentes, estados e padroes reutilizaveis para evoluir a plataforma." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader><h2 className="font-display text-xl font-semibold">Acoes</h2></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button icon={<Save className="h-4 w-4" />} onClick={() => toast.success("Acao primaria", "Componente pronto para formularios e workflows.")}>Primary</Button>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => toast.info("Acao secundaria", "Perfeita para exportacao, preview e atalhos.")}>Secondary</Button>
            <Button variant="ghost" icon={<Bell className="h-4 w-4" />} onClick={() => toast.info("Ghost acionado", "Uso ideal para ferramentas de baixo peso visual.")}>Ghost</Button>
            <Button variant="danger" onClick={() => toast.error("Acao critica", "Use este estado apenas para operacoes sensiveis.")}>Danger</Button>
            <Button loading>Loading</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="font-display text-xl font-semibold">Forms</h2></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Search</Label><Input placeholder="Buscar" /></div>
            <div className="space-y-2"><Label>Status</Label><Select><option>Aberto</option><option>Finalizado</option></Select></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="font-display text-xl font-semibold">Badges</h2></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge>Neutral</Badge><Badge tone="info">Info</Badge><Badge tone="success">Success</Badge><Badge tone="warning">Warning</Badge><Badge tone="danger">Error</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h2 className="font-display text-xl font-semibold">Estados</h2></CardHeader>
          <CardContent className="grid gap-3">
            {["Hover", "Focus", "Pressed", "Disabled", "Success", "Warning", "Error", "Empty"].map((state) => (
              <div className="flex items-center justify-between rounded-arena border border-arena-line bg-black/20 p-3" key={state}>
                <span>{state}</span>
                {state === "Success" ? <Check className="h-4 w-4 text-green-300" /> : <Search className="h-4 w-4 text-arena-muted" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
