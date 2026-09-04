import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ArrowRight, BookOpen, Clock3, LockKeyhole, Menu, Sparkles, UserRound, X } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KundliForm } from "@/components/KundliForm";
import { KundliReport } from "@/components/KundliReport";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { I18nProvider, useI18n, type Lang, LANGS } from "@/lib/i18n";
import { computeChart, type BirthInput, type Chart } from "@/lib/astro/vedic";
import { deleteChart, listSaved, markChartViewed, type SavedChart } from "@/lib/storage";
import { toast } from "sonner";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function SiteHeader({ onReset }: { onReset?: () => void }) {
  const { lang, setLang, t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header" data-testid="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand-lockup" onClick={onReset} data-testid="link-brand-home">
           <img src={`${import.meta.env.BASE_URL}pushyalipi-logo.png`} alt="Pushyalipi" className="brand-logo" data-testid="img-brand-logo" />
          <span><strong>{t("appName")}</strong><small>{t("tagline")}</small></span>
        </Link>
        <button type="button" className="mobile-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation" data-testid="button-toggle-navigation">
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <div className={`header-actions ${menuOpen ? "is-open" : ""}`}>
          <Link href="/history" className="header-link" data-testid="link-history"><BookOpen className="size-4" /> My charts</Link>
          <span className="header-note">Private by design</span>
          <Select value={lang} onValueChange={(value) => setLang(value as Lang)}>
            <SelectTrigger className="language-select" aria-label="Language" data-testid="select-language"><SelectValue /></SelectTrigger>
            <SelectContent>{LANGS.map((item) => <SelectItem key={item.code} value={item.code}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="signin-button" onClick={() => setAuthOpen(true)} data-testid="button-sign-in"><UserRound className="size-4" /> Sign in</Button>
        </div>
      </div>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </header>
  );
}

function GoogleMark() {
  return <span className="google-mark" aria-hidden="true">G</span>;
}

function AuthExperience({ compact = false }: { compact?: boolean }) {
  const [configurationError, setConfigurationError] = useState(false);
  const googleOAuthConfigured = false;

  const continueWithGoogle = () => {
    if (!googleOAuthConfigured) {
      setConfigurationError(true);
    }
  };

  return (
    <div className={`auth-experience${compact ? " auth-experience-compact" : ""}`}>
      <img src={`${import.meta.env.BASE_URL}pushyalipi-logo.png`} alt="Pushyalipi" className="auth-logo" data-testid="img-auth-logo" />
      <p className="dialog-kicker">PRIVATE LIBRARY</p>
      <h1>{compact ? "Keep your readings close." : "Sign in to Pushyalipi"}</h1>
      <p className="auth-intro">
        Sign in to keep your saved kundlis, reports, and preferences together.
      </p>
      <Button
        type="button"
        variant="outline"
        className="google-signin-button w-full"
        onClick={continueWithGoogle}
        data-testid="button-continue-google"
      >
        <GoogleMark /> Continue with Google
      </Button>
      {configurationError && (
        <div className="auth-error" role="alert" data-testid="status-google-auth-error">
          <strong>Google sign-in needs configuration</strong>
          <p>
            Google OAuth is not connected in this project yet. No sign-in was attempted. Configure the existing authentication provider to enable this button.
          </p>
        </div>
      )}
      <p className="auth-provider-note">
        <LockKeyhole className="size-3.5" /> Your birth details remain private.
      </p>
    </div>
  );
}

function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="auth-dialog">
        <DialogHeader className="sr-only">
          <DialogTitle>Sign in to Pushyalipi</DialogTitle>
          <DialogDescription>Continue with Google to access your private Pushyalipi library.</DialogDescription>
        </DialogHeader>
        <AuthExperience compact />
      </DialogContent>
    </Dialog>
  );
}

function Home({ chart, onSubmit, onReset }: { chart: Chart | null; onSubmit: (input: BirthInput) => boolean; onReset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="app-shell">
      <SiteHeader onReset={chart ? onReset : undefined} />
      {chart ? (
        <main className="report-main"><KundliReport chart={chart} onReset={onReset} /></main>
      ) : (
        <main>
          <section className="hero">
            <div className="hero-constellation" aria-hidden="true"><span className="star star-a" /><span className="star star-b" /><span className="star star-c" /><span className="orbit orbit-a" /><span className="orbit orbit-b" /></div>
            <div className="hero-inner">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-dot" /> {t("tagline")}</div>
                 <h1>{t("heroTitle").replace(/blueprint/gi, "birth chart")}</h1>
                <p>{t("heroSub")}</p>
                <div className="hero-actions"><a href="#birth-details" className="hero-cta" data-testid="link-begin-reading">Begin your reading <ArrowRight className="size-4" /></a><span className="hero-note"><LockKeyhole className="size-3.5" /> Computed locally, never sold</span></div>
              </div>
              <div className="hero-astral-card" aria-label="A preview of the Pushyalipi chart experience">
                 <div className="astral-card-top"><span>JANMA KUNDLI</span><span>D1 · D9 · D10</span></div>
                 <div className="astral-wheel"><div className="wheel-core"><Sparkles className="size-5" /><span>your<br />birth chart</span></div></div>
                 <div className="astral-card-bottom"><span>Sidereal · Lahiri</span><span>YOUR READING</span></div>
              </div>
              <div className="hero-proof"><span><strong>16</strong> divisional charts</span><span><strong>9</strong> planetary positions</span><span><strong>120</strong> year dasha cycle</span></div>
            </div>
          </section>
          <section className="trust-strip">
            <div><span className="trust-index">01</span><strong>Exact birth moment</strong><p>Date, time, and place shape the reading.</p></div>
            <div><span className="trust-index">02</span><strong>Classical calculations</strong><p>Sidereal positions and Lahiri ayanamsha.</p></div>
            <div><span className="trust-index">03</span><strong>Human-readable depth</strong><p>See the why behind every interpretation.</p></div>
          </section>
          <section className="form-section" id="birth-details">
            <div className="section-intro"><p className="section-kicker">THE MOMENT THAT MADE YOU</p><h2>Turn your birth moment into a clear reading.</h2><p>Enter the details as precisely as you know them. Pushyalipi calculates a complete Vedic chart privately in your browser.</p></div>
            <KundliForm onSubmit={onSubmit} />
          </section>
          <section className="method-section"><div className="method-label">A reading, not a verdict</div><div className="method-copy"><h2>Clarity without the theatre.</h2><p>Every placement is shown in context — sign, house, nakshatra, dignity, dasha, and the classical logic connecting them. Use the report as a thoughtful map, not a sentence.</p></div><div className="method-stamp"><span>शुभ</span><small>May it be auspicious</small></div></section>
        </main>
      )}
      <footer className="site-footer"><span>Pushyalipi · {t("tagline")}</span><span>For reflection, not replacement of professional advice.</span></footer>
    </div>
  );
}

function HistoryPage({ onLoad }: { onLoad: (chart: SavedChart) => void }) {
  const [, setLocation] = useLocation();
  const [saved, setSaved] = useState<SavedChart[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => { setSaved(listSaved()); setLoading(false); }, 280);
    return () => window.clearTimeout(timer);
  }, []);
  const loadChart = (item: SavedChart) => {
    try {
      setSaved(markChartViewed(item.id));
      onLoad(item);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open this chart.");
    }
  };
  const removeChart = (id: string) => {
    try {
      setSaved(deleteChart(id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this chart.");
    }
  };
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="history-main">
        <div className="history-heading"><div><p className="section-kicker">YOUR PRIVATE LIBRARY</p><h1>Saved kundlis</h1><p>Return to a reading whenever you need its perspective.</p></div><Button onClick={() => setLocation("/")} className="gap-2" data-testid="button-create-new-chart"><Sparkles className="size-4" /> New kundli</Button></div>
        {loading ? <div className="history-grid" data-testid="status-history-loading">{[1, 2, 3].map((item) => <div className="history-skeleton" key={item} />)}</div> : saved.length === 0 ? <div className="history-empty" data-testid="status-history-empty"><span className="empty-orbit"><Clock3 className="size-6" /></span><h2>Your library is quiet.</h2><p>Generate your first kundli and it will appear here, saved privately in this browser.</p><Button onClick={() => setLocation("/")} variant="outline" data-testid="button-empty-create">Create your first chart</Button></div> : <div className="history-grid">{saved.map((item) => <article className="history-card" key={item.id} data-testid={`card-saved-chart-${item.id}`}><div className="history-card-mark"><Sparkles className="size-4" /></div><div className="history-card-body"><p className="history-card-date">{new Date(item.lastViewedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p><h2>{item.name}</h2><p>{item.date} · {item.time}</p><p className="history-place">{item.place}</p></div><div className="history-card-actions"><Button size="sm" onClick={() => loadChart(item)} data-testid={`button-load-chart-${item.id}`}>Open reading <ArrowRight className="size-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => removeChart(item.id)} data-testid={`button-delete-chart-${item.id}`}>Remove</Button></div></article>)}</div>}
      </main>
      <footer className="site-footer"><span>Pushyalipi · Your chart, computed with care</span><span>Private by design</span></footer>
    </div>
  );
}

function AuthPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="auth-page">
      <div className="auth-page-card">
        <AuthExperience />
        <Button onClick={() => setLocation("/")} variant="ghost" className="auth-return-button w-full" data-testid="button-auth-return">
          Return to Pushyalipi <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function AppContent() {
  const [chart, setChart] = useState<Chart | null>(null);
  const [, setLocation] = useLocation();
  const handleSubmit = (input: BirthInput): boolean => {
    try {
      setChart(computeChart(input));
      setLocation("/");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Could not compute this chart. Please check the birth details.");
      return false;
    }
  };
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <Switch>
            <Route path="/history"><HistoryPage onLoad={handleSubmit} /></Route>
            <Route path="/auth"><AuthPage /></Route>
            <Route path="/"><Home chart={chart} onSubmit={handleSubmit} onReset={() => setChart(null)} /></Route>
            <Route component={NotFound} />
          </Switch>
        </I18nProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AppContent />
    </WouterRouter>
  );
}

export default App;