"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, Sparkles, Calendar, Check } from "lucide-react";
import posthog from "posthog-js";

type Enrichment = {
    aiTitle: string | null;
    aiBullets: string[] | null;
    aiCategory: string | null;
};

type EntryData = {
    id: string;
    entry_date: string;
    raw_text: string;
    enrichment: Enrichment | null;
};

export default function DashboardPage() {
    const [entry, setEntry] = useState("");
    const [entryId, setEntryId] = useState<string | null>(null);
    const [enrichment, setEnrichment] = useState<Enrichment | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const searchParams = useSearchParams();
    const entryDateParam = searchParams.get("date");
    const reminderParam = searchParams.get("reminder");

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    // Load today's entry on mount
    useEffect(() => {
        const loadTodayEntry = async () => {
            try {
                const res = await fetch(
                    entryDateParam
                        ? `/api/entries/${entryDateParam}`
                        : "/api/entries/today"
                );
                if (!res.ok) throw new Error("Failed to load entry");

                const data = await res.json();
                const payload = data.entry || data;
                if ((data.exists && data.entry) || payload?.id) {
                    setEntry(payload.raw_text);
                    setEntryId(payload.id);
                    setEnrichment(
                        payload.enrichment
                            ? {
                                aiTitle: payload.enrichment.ai_title,
                                aiBullets: payload.enrichment.ai_bullets,
                                aiCategory: payload.enrichment.ai_category,
                            }
                            : null
                    );
                    setLastSaved(new Date(payload.updated_at));
                } else {
                    // Check for draft in localStorage
                    const draft = localStorage.getItem("accomplish-draft");
                    if (draft) {
                        setEntry(draft);
                        setHasUnsavedChanges(true);
                    }
                }
            } catch (error) {
                console.error("Failed to load entry:", error);
                // Fall back to localStorage
                const draft = localStorage.getItem("accomplish-draft");
                if (draft) setEntry(draft);
            } finally {
                setIsLoading(false);
            }
        };

        loadTodayEntry();
    }, [entryDateParam]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const onboarded = localStorage.getItem("accomplish-onboarded");
        if (!onboarded) {
            setShowOnboarding(true);
        }
    }, []);

    useEffect(() => {
        if (reminderParam === "1") {
            posthog.capture("reminder_clicked", {
                source: "email",
            });
        }
    }, [reminderParam]);

    useEffect(() => {
        posthog.capture("entries_viewed", {
            scope: entryDateParam ? "date" : "today",
        });
    }, [entryDateParam]);

    // Auto-save draft to localStorage every 30s
    useEffect(() => {
        if (!entry || !hasUnsavedChanges) return;

        const interval = setInterval(() => {
            localStorage.setItem("accomplish-draft", entry);
        }, 30000);

        return () => clearInterval(interval);
    }, [entry, hasUnsavedChanges]);

    // Handle entry change
    const handleEntryChange = (value: string) => {
        if (value.length <= 5000) {
            setEntry(value);
            setHasUnsavedChanges(true);
        }
    };

    // Save entry
    const handleSave = useCallback(async () => {
        if (!entry.trim()) {
            toast.error("Please write something before saving.");
            return;
        }

        const isEdit = Boolean(entryId);

        setIsSaving(true);

        try {
            const res = await fetch("/api/entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ raw_text: entry }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to save entry");
            }

            const data: EntryData = await res.json();
            setEntryId(data.id);
            localStorage.removeItem("accomplish-draft");
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            posthog.capture(isEdit ? "entry_edited" : "entry_created", {
                entry_date: data.entry_date,
            });
            toast.success("Entry saved successfully!");
        } catch (error) {
            console.error("Save error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to save entry. Please try again.");
        } finally {
            setIsSaving(false);
        }
    }, [entry]);

    // Enhance with AI
    const handleEnhance = async () => {
        if (!entryId) {
            toast.error("Please save your entry first.");
            return;
        }

        posthog.capture("ai_enhance_clicked", {
            entry_id: entryId,
        });
        setIsEnhancing(true);

        try {
            const res = await fetch("/api/ai/enhance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entry_id: entryId }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to enhance entry");
            }

            const data = await res.json();
            setEnrichment({
                aiTitle: data.ai_title,
                aiBullets: data.ai_bullets,
                aiCategory: data.ai_category,
            });
            posthog.capture("ai_enhance_succeeded", {
                entry_id: entryId,
            });
            posthog.capture("ai_version_saved", {
                entry_id: entryId,
            });
            toast.success("Entry enhanced with AI!");
        } catch (error) {
            console.error("Enhance error:", error);
            posthog.capture("ai_enhance_failed", {
                entry_id: entryId,
            });
            toast.error(error instanceof Error ? error.message : "Failed to enhance entry.");
        } finally {
            setIsEnhancing(false);
        }
    };

    // Keyboard shortcut: Cmd/Ctrl + Enter to save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSave]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Welcome to Accomplish</DialogTitle>
                        <DialogDescription>
                            Capture what you did today in a single place. You can optionally enhance with
                            AI after saving.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                        Example: "Shipped the onboarding flow, reduced activation time by 40%, and fixed
                        3 payment bugs."
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                localStorage.setItem("accomplish-onboarded", "true");
                                setShowOnboarding(false);
                            }}
                            className="cursor-pointer"
                        >
                            Skip for now
                        </Button>
                        <Button
                            onClick={() => {
                                setEntry(
                                    "Shipped the onboarding flow, reduced activation time by 40%, and fixed 3 payment bugs."
                                );
                                setHasUnsavedChanges(true);
                                localStorage.setItem("accomplish-onboarded", "true");
                                setShowOnboarding(false);
                            }}
                            className="bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white cursor-pointer"
                        >
                            Use example entry
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Date Header */}
            <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">{today}</span>
                {entryId && !hasUnsavedChanges && (
                    <Badge variant="secondary" className="ml-2">
                        <Check className="w-3 h-3 mr-1" />
                        Saved
                    </Badge>
                )}
            </div>

            {/* Entry Card */}
            <Card className="shadow-lg border-border">
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold text-foreground">
                        What did you accomplish today?
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        value={entry}
                        onChange={(e) => handleEntryChange(e.target.value)}
                        placeholder="Today I worked on..."
                        className="min-h-[150px] resize-y text-base leading-relaxed focus-ring"
                        maxLength={5000}
                        rows={3}
                    />

                    {/* Character count */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{entry.length.toLocaleString()} / 5,000 characters</span>
                        {lastSaved && !hasUnsavedChanges && (
                            <span className="text-primary">
                                Saved {lastSaved.toLocaleTimeString()}
                            </span>
                        )}
                        {hasUnsavedChanges && (
                            <span className="text-amber-500">Unsaved changes</span>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={!entry.trim() || isSaving}
                            className="bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white cursor-pointer"
                            title="Save entry (Ctrl/⌘ + Enter)"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Entry
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            disabled={!entryId || isEnhancing || hasUnsavedChanges}
                            onClick={handleEnhance}
                            className="cursor-pointer"
                            title="Enhance with AI after saving"
                        >
                            {isEnhancing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                                    Enhancing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Enhance with AI
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Keyboard hint */}
                    <p className="text-xs text-muted-foreground">
                        Pro tip: Press{" "}
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                            ⌘/Ctrl + Enter
                        </kbd>{" "}
                        to save quickly
                    </p>
                </CardContent>
            </Card>

            {/* AI Enhancement Preview */}
            {enrichment && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card className="shadow-md border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Original Entry</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-foreground whitespace-pre-wrap">{entry}</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-md border-primary/20 bg-primary/5">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <CardTitle className="text-lg">AI Enhancement</CardTitle>
                                {enrichment.aiCategory && (
                                    <Badge variant="outline" className="ml-auto">
                                        {enrichment.aiCategory}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {enrichment.aiTitle && (
                                <h3 className="font-semibold text-foreground">
                                    {enrichment.aiTitle}
                                </h3>
                            )}
                            {enrichment.aiBullets && (
                                <ul className="space-y-2">
                                    {enrichment.aiBullets.map((bullet, i) => (
                                        <li key={i} className="flex items-start gap-2 text-foreground">
                                            <span className="text-primary mt-1">•</span>
                                            <span>{bullet}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
