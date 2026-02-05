"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { BookOpen, Settings, BarChart3, Sparkles, FileText } from "lucide-react";
import posthog from "posthog-js";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId, isSignedIn } = useAuth();

    useEffect(() => {
        if (isSignedIn && userId) {
            // Identify user in PostHog
            posthog.identify(userId);
            
            // Capture user_signed_up if this is their first session
            // We use localStorage to track if we've already captured this
            const hasCapturedSignUp = localStorage.getItem("accomplish-signup-captured");
            if (!hasCapturedSignUp) {
                posthog.capture("user_signed_up");
                localStorage.setItem("accomplish-signup-captured", "true");
            }
        }
    }, [isSignedIn, userId]);

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="fixed top-4 left-4 right-4 z-50">
                <div className="max-w-5xl mx-auto bg-card/80 backdrop-blur-md rounded-2xl px-6 py-4 shadow-md border border-border">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="text-xl font-bold text-primary">
                            Accomplish
                        </Link>
                        <div className="flex items-center gap-6">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <BookOpen className="w-4 h-4" />
                                Today
                            </Link>
                            <Link
                                href="/entries"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <BarChart3 className="w-4 h-4" />
                                Entries
                            </Link>
                            <Link
                                href="/review"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <Sparkles className="w-4 h-4" />
                                Review
                            </Link>
                            <Link
                                href="/resume"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <FileText className="w-4 h-4" />
                                Resume
                            </Link>
                            <Link
                                href="/settings"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <Settings className="w-4 h-4" />
                                Settings
                            </Link>
                            <UserButton
                                appearance={{
                                    elements: {
                                        avatarBox: "w-9 h-9",
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-28 pb-12 px-4">
                <div className="max-w-3xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
