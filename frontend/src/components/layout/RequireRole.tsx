import { LockKeyhole, LogIn, ShieldX } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useSessionStore } from "../../stores/sessionStore";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

export function RequireRole({ role, children }: { role: string; children: ReactNode }) {
  const { token, user, loading, switchContext } = useAuth();
  const [switching, setSwitching] = useState(false);
  const setAuthModalOpen = useSessionStore((state) => state.setAuthModalOpen);

  useEffect(() => {
    if (!loading && user?.roles?.includes(role) && user.active_role !== role) {
      setSwitching(true);
      void switchContext({ role }).finally(() => setSwitching(false));
    }
  }, [loading, role, user?.active_role]);

  if (loading || switching || (user?.roles?.includes(role) && user.active_role !== role)) {
    return <div className="space-y-4 px-4 py-10 lg:px-8"><Skeleton className="h-12 w-72" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!token || !user) {
    return (
      <AccessPanel
        action={<Button icon={<LogIn className="h-4 w-4" />} onClick={() => setAuthModalOpen(true)}>Entrar na plataforma</Button>}
        description="Faca login com uma conta autorizada para acessar as ferramentas de operação."
        icon={<LockKeyhole className="h-7 w-7 text-cyan-200" />}
        title="Area administrativa protegida"
      />
    );
  }

  if (!user.roles?.includes(role)) {
    return (
      <AccessPanel
        description={`Sua conta esta autenticada como ${user.role ?? "usuario"}, mas esta area exige o perfil ${role}.`}
        icon={<ShieldX className="h-7 w-7 text-red-300" />}
        title="Perfil sem permissao"
      />
    );
  }

  return children;
}

function AccessPanel({ title, description, icon, action }: { title: string; description: string; icon: ReactNode; action?: ReactNode }) {
  return (
    <section className="flex min-h-[65vh] items-center justify-center px-4 py-12 lg:px-8">
      <Card className="w-full max-w-lg">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center border border-arena-line bg-white/[.04]">{icon}</div>
          <h1 className="mt-5 font-display text-2xl font-bold">{title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-arena-muted">{description}</p>
          {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
        </CardContent>
      </Card>
    </section>
  );
}
