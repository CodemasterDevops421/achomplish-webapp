import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, FileText, Clock } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-4 left-4 right-4 z-50">
        <div className="max-w-4xl mx-auto bg-card/80 backdrop-blur-md rounded-2xl px-6 py-4 shadow-md border border-border">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-primary">
              Accomplish
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/sign-in">
                <Button variant="ghost" className="cursor-pointer">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <Button className="bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white cursor-pointer">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Remember what you did.
            <br />
            <span className="text-primary">Never struggle with reviews again.</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A simple daily work diary that captures your accomplishments and helps you
            generate performance review drafts in seconds.
          </p>

          {/* Benefits */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span>One question, one box</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Optional AI enhancement</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" />
              <span>Export-ready reviews</span>
            </div>
          </div>

          {/* CTA */}
          <Link href="/sign-up">
            <Button
              size="lg"
              className="bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
            >
              Start Logging Free
            </Button>
          </Link>

          <p className="text-sm text-muted-foreground mt-4">
            Free forever. No credit card required.
          </p>
        </div>

        {/* Preview Card */}
        <div className="max-w-2xl mx-auto mt-16">
          <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              What did you accomplish today?
            </h3>
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <p className="text-muted-foreground italic">
                "Shipped the new onboarding flow, reducing time-to-activation by 40%.
                Fixed 3 critical bugs in the payment system. Led sprint planning for Q1..."
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-lg">
                ✨ Enhanced with AI
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2026 Accomplish. Built with ❤️ for busy professionals.</p>
        </div>
      </footer>
    </div>
  );
}
