import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  FileText,
  Clock,
  ShieldCheck,
  Zap,
  Layers,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="landing-root min-h-screen text-foreground">
      <nav className="fixed top-4 left-4 right-4 z-50">
        <div className="landing-card max-w-6xl mx-auto rounded-3xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="landing-display text-2xl font-semibold text-primary">
              Accomplish
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline-flex landing-chip px-3 py-1 rounded-full text-xs font-semibold">
                Daily wins, distilled
              </span>
              <Button asChild variant="ghost" className="cursor-pointer">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button
                asChild
                className="bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white cursor-pointer"
              >
                <Link href="/sign-up">Start Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6">
        <section className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <div className="space-y-8">
            <div className="landing-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              Built for review season survival
            </div>

            <div className="space-y-5">
              <h1 className="landing-display text-4xl md:text-6xl leading-tight font-semibold">
                Turn scattered work into
                <span className="text-primary"> undeniable impact</span>.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                Accomplish is a daily work log that captures wins in one prompt, then
                shapes them into review-ready stories, bullets, and brag docs on demand.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="landing-glow bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white text-lg px-8 py-6 rounded-2xl shadow-lg cursor-pointer"
              >
                <Link href="/sign-up">
                  Start Logging Today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-2xl px-8 py-6 border-primary/30 text-primary hover:text-primary cursor-pointer"
              >
                <Link href="/sign-in">I already have an account</Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                One question, one entry
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                AI is opt-in
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Export-ready in minutes
              </div>
            </div>
          </div>

          <div className="landing-grid relative rounded-[32px] p-6 lg:p-8">
            <div className="landing-card rounded-[28px] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Today, 6:30 PM
                </div>
                <span className="landing-chip px-3 py-1 text-xs font-semibold rounded-full">
                  Daily log
                </span>
              </div>
              <div>
                <h3 className="landing-display text-xl font-semibold mb-2">
                  What did you accomplish today?
                </h3>
                <div className="landing-outline rounded-2xl p-4 text-sm text-muted-foreground">
                  “Launched the new onboarding flow, cut activation time by 40%, and
                  fixed three payment bugs. Mentored two new hires and unblocked QA.”
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-4 h-4" />
                  AI impact framing ready
                </div>
                <div className="flex items-center gap-2 text-primary">
                  <FileText className="w-4 h-4" />
                  Review draft: 3 paragraphs + 8 bullets
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full bg-primary/20 blur-2xl" />
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-[var(--cta)]/25 blur-2xl" />
          </div>
        </section>

        <section className="max-w-6xl mx-auto mt-20 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Layers,
              title: "Weekly storylines",
              copy: "Cluster entries by theme and see momentum across projects.",
            },
            {
              icon: Sparkles,
              title: "AI enhancement",
              copy: "One click to transform raw notes into impact bullets and tags.",
            },
            {
              icon: FileText,
              title: "Export in seconds",
              copy: "Download review drafts or resume bullets in markdown or docx.",
            },
          ].map((item) => (
            <div key={item.title} className="landing-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="landing-chip rounded-2xl px-3 py-2">
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-muted-foreground">V1 ready</span>
              </div>
              <h3 className="landing-display text-xl font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.copy}</p>
            </div>
          ))}
        </section>

        <section className="max-w-6xl mx-auto mt-20 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] items-center">
          <div className="landing-card rounded-3xl p-8 space-y-6">
            <div className="landing-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Loved by busy teams
            </div>
            <p className="landing-display text-2xl font-semibold leading-snug">
              “Finally, a daily log that feels effortless. I walk into reviews with a
              highlight reel instead of a memory scramble.”
            </p>
            <div className="text-sm text-muted-foreground">
              Priya N. · Engineering Manager
            </div>
          </div>
          <div className="landing-card rounded-3xl p-8 space-y-5">
            <h3 className="landing-display text-2xl font-semibold">Ship your next review with proof.</h3>
            <p className="text-muted-foreground">
              Start today, log in 2 minutes, and get a complete review narrative by Friday.
              No more backfilling from memory.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                className="bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white cursor-pointer"
              >
                <Link href="/sign-up">Start Free</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-primary/30 text-primary cursor-pointer"
              >
                <Link href="/entries">See sample entries</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 pb-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="landing-display text-lg text-primary">Accomplish</div>
          <p>Remember what you did. Never struggle with reviews again.</p>
          <span>© 2026 Accomplish</span>
        </div>
      </footer>
    </div>
  );
}
