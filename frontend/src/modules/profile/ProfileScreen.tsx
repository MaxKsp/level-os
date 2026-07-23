import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

type ActivityEvent = {
  event_type: string;
  outcome: string;
  ip_address: string | null;
  created_at: string;
};
import { Button } from "../../components/ui/Button";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { Icon, SectionCard } from "../../design-system";
import { cn } from "../../lib/cn";
import { loadProfileData, saveProfileData, type ProfileData } from "./storage";
import { useProgress } from "../progress/store";
import { AchievementsModal } from "../progress/components/AchievementsModal";
import { XpBar } from "../progress/components/XpBar";
import { SubscriptionPlanSection } from "../subscription/SubscriptionPlanSection";
import { useIdentity } from "../identity/store";
import { usePreferences } from "../preferences/store";
import { TwoFactorSection } from "./TwoFactorSection";
import { GoogleCalendarSection } from "../calendar/GoogleCalendarSection";

const field =
  "w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-primary";
const label = "mb-1.5 block text-xs font-medium text-on-surface-variant";
type ProfileView = "data" | "preferences" | "security";

export function ProfileScreen() {
  const { progress } = useProgress();
  const { identity, status: identityStatus, error: identityError, uploadAvatar } = useIdentity();
  const { notifications, notify_email: notifyEmail, status: preferencesStatus, error: preferencesError, toggleNotification, setNotifyEmail } = usePreferences();
  const [profile, setProfile] = useState<ProfileData>(loadProfileData);
  const [saved, setSaved] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [dataStatus, setDataStatus] = useState<string | null>(null);
  const [profileView, setProfileView] = useState<ProfileView>(() =>
    window.location.hash === "#integrations" ? "preferences" : "data",
  );
  const restoreRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const initials =
    identity.username
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "OR";
  const avatarUrl = identity.avatar ? (identity.avatar.startsWith("http") || identity.avatar.startsWith("/") ? identity.avatar : `/${identity.avatar}`) : null;
  const completion = Math.round(
    ([
      identity.username,
      identity.email,
      profile.phone,
      profile.city,
      profile.bio,
    ].filter(Boolean).length /
      5) *
      100,
  );
  const unlockedAchievements = progress.achievements.filter((achievement) => achievement.unlocked).length;

  useEffect(() => setProfile((current) => ({ ...current, name: identity.username, email: identity.email })), [identity.username, identity.email]);

  const saveProfile = () => {
    saveProfileData(profile);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const updateAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true); setDataStatus(null);
    try {
      await uploadAvatar(file);
      setDataStatus("Foto atualizada.");
    } catch (cause) {
      setDataStatus(cause instanceof Error ? cause.message : "Não foi possível atualizar a foto.");
    } finally {
      setAvatarBusy(false); event.target.value = "";
    }
  };

  const restoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setDataStatus("O backup excede o limite de 10 MB."); return; }
    if (!window.confirm("A restauração substituirá os dados atuais. Deseja continuar?")) { event.target.value = ""; return; }
    setDataStatus("Restaurando backup…");
    try {
      const buffer = await file.arrayBuffer();
      const head = new Uint8Array(buffer.slice(0, 7));
      const isEncrypted = String.fromCharCode(...head) === "ORBYBKP";
      let body: BodyInit;
      let contentType: string;
      if (isEncrypted) {
        body = buffer;
        contentType = "application/octet-stream";
      } else {
        const raw = new TextDecoder().decode(buffer);
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Backup inválido ou incompatível.");
        body = raw;
        contentType = "application/json";
      }
      const response = await fetch("/api/import.php", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": contentType, "X-CSRF-Token": window.CSRF_TOKEN ?? "", "X-Confirm-Restore": "replace" },
        body,
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || `Erro HTTP ${response.status}`);
      setDataStatus("Backup restaurado. Recarregando…");
      window.location.reload();
    } catch (cause) {
      setDataStatus(cause instanceof Error ? cause.message : "Backup inválido ou incompatível com o Level OS.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <main className="level-page mx-auto flex max-w-[1080px] flex-col gap-6 px-4 pb-24 pt-24 sm:px-6">
      <section className="border-y border-outline-variant py-6 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <div className="level-metallic-preview grid h-20 w-20 overflow-hidden place-items-center rounded-xl border border-primary/20 bg-primary/10 text-2xl font-semibold text-primary">
              {avatarUrl ? <img src={avatarUrl} alt={`Foto de ${identity.username}`} className="h-full w-full object-cover" /> : initials}
            </div>
            <button type="button" onClick={() => avatarRef.current?.click()} disabled={avatarBusy || !window.CSRF_TOKEN} className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-lg border border-outline-variant bg-surface-container text-primary shadow-sm disabled:opacity-50" aria-label="Alterar foto de perfil">
              <Icon name="photo_camera" className="text-[16px]" />
            </button>
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={updateAvatar} className="sr-only" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="level-page-title truncate text-3xl font-semibold tracking-tight text-on-surface">
                {identityStatus === "loading" ? "Carregando perfil…" : identity.username}
              </h1>
              <span className="rounded-md bg-tertiary/10 px-2.5 py-1 text-xs font-medium text-tertiary">
                Identidade Level OS
              </span>
            </div>
            <p className="mt-1 truncate text-on-surface-variant">
              {identity.email || "Preview local sem sessão PHP"}
            </p>
            <div className="mt-3 flex max-w-sm items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <span className="font-mono text-xs text-muted">
                <AnimatedNumber value={completion} animationKey="profile-completion" formatValue={(value) => `${Math.round(value)}% completo`} />
              </span>
            </div>
            {identityError ? <p role="alert" className="mt-2 text-xs text-error">{identityError}</p> : null}
          </div>
        </div>
      </section>

      <SubscriptionPlanSection />

      <section id="progress" className="border-t border-outline-variant pt-5" aria-labelledby="profile-progress-title">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div>
            <p className="text-sm font-medium text-primary">Progressão</p>
            <h2 id="profile-progress-title" className="mt-3 text-xl font-medium text-on-surface">Nível <AnimatedNumber value={progress.level} animationKey="profile-level" formatValue={(value) => Math.round(value).toLocaleString("pt-BR")} /> · {progress.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted"><AnimatedNumber value={progress.xp} animationKey="profile-xp" formatValue={(value) => `${Math.round(value).toLocaleString("pt-BR")} XP`} /> acumulados e <AnimatedNumber value={progress.streak} animationKey="profile-streak" formatValue={(value) => Math.round(value).toLocaleString("pt-BR")} /> dias em sequência.</p>
            <XpBar value={progress.progress_pct} animationKey="profile-progress-percent" className="mt-5" label={`${progress.xp_to_next.toLocaleString("pt-BR")} XP até o próximo nível`} />
          </div>
          <div className="flex flex-col justify-between border-t border-outline-variant pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div className="grid grid-cols-2 border-y border-outline-variant">
              <div className="px-3 py-4">
                <p className="text-xs text-muted">Desbloqueadas</p>
                <p className="mt-1 font-mono text-xl font-semibold text-on-surface"><AnimatedNumber value={unlockedAchievements} animationKey="profile-achievements-unlocked" formatValue={(value) => Math.round(value).toLocaleString("pt-BR")} />/<AnimatedNumber value={progress.achievements.length} animationKey="profile-achievements-total" formatValue={(value) => Math.round(value).toLocaleString("pt-BR")} /></p>
              </div>
              <div className="border-l border-outline-variant px-3 py-4">
                <p className="text-xs text-muted">Próximo marco</p>
                <p className="mt-1 truncate text-sm font-medium text-on-surface">{progress.achievements.find((achievement) => !achievement.unlocked)?.title ?? "Coleção completa"}</p>
              </div>
            </div>
            <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => setAchievementsOpen(true)}>
              <Icon name="trophy" className="text-[17px] text-primary" />
              Ver conquistas
            </Button>
          </div>
        </div>
      </section>

      <AchievementsModal isOpen={achievementsOpen} onClose={() => setAchievementsOpen(false)} achievements={progress.achievements} />

      <div className="flex gap-1 border-b border-outline-variant" role="tablist" aria-label="Seções do perfil">
        {([[
          "data", "Dados",
        ], ["preferences", "Preferências"], ["security", "Segurança"]] as const).map(([id, text]) => (
          <button key={id} type="button" role="tab" aria-selected={profileView === id} onClick={() => setProfileView(id)} className={cn("min-h-11 border-b-2 px-4 text-sm font-medium transition-colors", profileView === id ? "border-primary text-on-surface" : "border-transparent text-muted hover:text-on-surface")}>{text}</button>
        ))}
      </div>

      <div role="tabpanel" className={cn("grid items-start gap-8", profileView === "preferences" ? "lg:grid-cols-[1.12fr_.88fr]" : "lg:grid-cols-1")}>
        <div className={cn("flex flex-col gap-8", profileView === "security" && "hidden")}>
          {profileView === "data" ? <SectionCard
            title="Dados pessoais"
            description="Como você aparece no Level OS"
            icon={<Icon name="person" className="text-[20px] text-primary" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field title="Nome completo">
                <input
                  className={cn(field, "cursor-not-allowed opacity-75")}
                  value={identity.username}
                  readOnly
                />
              </Field>
              <Field title="E-mail">
                <input
                  className={cn(field, "cursor-not-allowed opacity-75")}
                  type="email"
                  value={identity.email}
                  readOnly
                />
              </Field>
              <Field title="Telefone">
                <input
                  className={field}
                  placeholder="(11) 99999-9999"
                  value={profile.phone}
                  onChange={(event) =>
                    setProfile({ ...profile, phone: event.target.value })
                  }
                />
              </Field>
              <Field title="Cidade">
                <input
                  className={field}
                  placeholder="Sua cidade"
                  value={profile.city}
                  onChange={(event) =>
                    setProfile({ ...profile, city: event.target.value })
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <Field title="Sobre você">
                  <textarea
                    className={cn(field, "min-h-24 resize-y")}
                    value={profile.bio}
                    onChange={(event) =>
                      setProfile({ ...profile, bio: event.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="flex items-center justify-end gap-3 sm:col-span-2">
                <span
                  role="status"
                  className={cn(
                    "text-xs text-tertiary transition-opacity",
                    saved ? "opacity-100" : "opacity-0",
                  )}
                >
                  <Icon
                    name="check_circle"
                    className="mr-1 align-middle text-[16px]"
                  />
                  Dados salvos
                </span>
                <Button onClick={saveProfile}>Salvar alterações</Button>
              </div>
            </div>
          </SectionCard> : null}

          {profileView === "preferences" ? <SectionCard
            title="Notificações"
            description="Escolha os alertas que importam"
            icon={
              <Icon name="notifications" className="text-[20px] text-primary" />
            }
            bodyClassName="p-0"
          >
            <div className="divide-y divide-outline-variant">
              <Toggle
                title="Lembretes da rotina"
                description="Tarefas e compromissos do dia"
                checked={notifications.tasks}
                onChange={() => toggleNotification("tasks")}
              />
              <Toggle
                title="Alertas financeiros"
                description="Vencimentos, faturas e saldo"
                checked={notifications.finance}
                onChange={() => toggleNotification("finance")}
              />
              <Toggle
                title="Backup por e-mail"
                description="Envia um backup cifrado por mês (desativado por padrão)"
                checked={notifications.backup}
                onChange={() => toggleNotification("backup")}
              />
              <Toggle
                title="Receber notificações por e-mail"
                description="Canal principal configurado na sua conta"
                checked={notifyEmail}
                onChange={() => setNotifyEmail(!notifyEmail)}
              />
            </div>
            {preferencesStatus === "saving" ? <p className="px-5 py-3 text-xs text-muted">Salvando preferências…</p> : null}
            {preferencesError ? <p role="alert" className="px-5 py-3 text-xs text-error">{preferencesError}</p> : null}
          </SectionCard> : null}
        </div>

        <div className={cn("flex flex-col gap-8", profileView === "data" && "hidden")}>
          {profileView === "preferences" ? <SectionCard
            title="Aparência"
            description="Tema claro ou escuro"
            icon={<Icon name="palette" className="text-[20px] text-primary" />}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-on-surface">Tema</p>
                  <p className="text-xs text-muted">Escuro ou claro</p>
                </div>
                <ThemeToggle showLabel />
              </div>
            </div>
          </SectionCard> : null}

          {profileView === "preferences" ? <div id="integrations" className="scroll-mt-24">
            <GoogleCalendarSection />
          </div> : null}

          {profileView === "security" ? <TwoFactorSection /> : null}

          {profileView === "security" ? <ActivityLog /> : null}

          {profileView === "security" ? <SectionCard
            title="Segurança e dados"
            description="Proteção e portabilidade"
            icon={<Icon name="shield" className="text-[20px] text-primary" />}
          >
            <div className="grid gap-2">
              <a
                href="/forgot-password.php"
                className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container px-3 py-3 text-sm text-on-surface hover:border-primary/45"
              >
                <span className="flex items-center gap-2">
                  <Icon name="password" className="text-[18px] text-primary" />
                  Alterar senha
                </span>
                <Icon name="arrow_forward" className="text-[16px] text-muted" />
              </a>
              <button
                onClick={() => window.location.assign("/api/export.php")}
                className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container px-3 py-3 text-left text-sm text-on-surface hover:border-primary/45"
              >
                <span className="flex items-center gap-2">
                  <Icon name="download" className="text-[18px] text-primary" />
                  Exportar backup
                </span>
                <Icon
                  name="arrow_downward"
                  className="text-[16px] text-muted"
                />
              </button>
              <button
                onClick={() => restoreRef.current?.click()}
                className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container px-3 py-3 text-left text-sm text-on-surface hover:border-primary/45"
              >
                <span className="flex items-center gap-2">
                  <Icon name="upload" className="text-[18px] text-primary" />
                  Restaurar backup
                </span>
                <Icon name="arrow_upward" className="text-[16px] text-muted" />
              </button>
              <input
                ref={restoreRef}
                type="file"
                accept="application/json,.json,.lvbk"
                onChange={restoreBackup}
                className="sr-only"
              />
              {dataStatus ? <p role="status" className="px-1 py-2 text-xs text-muted">{dataStatus}</p> : null}
              <Button
                variant="danger"
                className="mt-2 w-full"
                onClick={() => window.location.assign("/logout.php")}
              >
                <Icon name="logout" className="text-[18px]" />
                Sair da conta
              </Button>
            </div>
          </SectionCard> : null}
        </div>
      </div>
    </main>
  );
}

const EVENT_LABELS: Record<string, string> = {
  "auth.login": "Login",
  "auth.2fa": "Verificação em 2 etapas",
  "auth.logout": "Saída da conta",
  "auth.password_reset.requested": "Solicitação de nova senha",
  "auth.password_reset.completed": "Senha redefinida",
  "auth.account_created": "Conta criada",
  "auth.identity_linked": "Conta vinculada",
  "backup.restore": "Backup restaurado",
};

const OUTCOME_ICON: Record<string, string> = {
  success: "check_circle",
  failure: "cancel",
  denied: "block",
};

const OUTCOME_COLOR: Record<string, string> = {
  success: "text-tertiary",
  failure: "text-error",
  denied: "text-warning",
};

function formatActivityDate(raw: string): string {
  try {
    const d = new Date(raw.replace(" ", "T") + "Z");
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return raw;
  }
}

function ActivityLog() {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/activity.php", { credentials: "same-origin" })
      .then((r) => r.json() as Promise<{ events?: ActivityEvent[] }>)
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setError("Não foi possível carregar a atividade."));
  }, []);

  return (
    <SectionCard
      title="Últimos acessos"
      description="Atividade recente da sua conta"
      icon={<Icon name="history" className="text-[20px] text-primary" />}
      bodyClassName={events && events.length > 0 ? "p-0" : undefined}
    >
      {error ? (
        <p role="alert" className="text-xs text-error">{error}</p>
      ) : events === null ? (
        <p className="text-xs text-muted">Carregando…</p>
      ) : events.length === 0 ? (
        <p className="text-xs text-muted">Nenhuma atividade registrada ainda.</p>
      ) : (
        <div className="divide-y divide-outline-variant">
          {events.map((ev, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Icon
                name={OUTCOME_ICON[ev.outcome] ?? "info"}
                className={cn("shrink-0 text-[18px]", OUTCOME_COLOR[ev.outcome] ?? "text-muted")}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-on-surface">
                  {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                </p>
                {ev.ip_address ? (
                  <p className="text-xs text-muted">{ev.ip_address}</p>
                ) : null}
              </div>
              <time className="shrink-0 text-xs text-muted tabular-nums">
                {formatActivityDate(ev.created_at)}
              </time>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <label>
      <span className={label}>{title}</span>
      {children}
    </label>
  );
}

function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-container/60">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-on-surface">
          {title}
        </span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}
