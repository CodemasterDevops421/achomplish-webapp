"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Sparkles, Calendar, Check } from "lucide-react";

type Enrichment = {
    aiTitle: string | null;
    aiBullets: string[] | null;
    aiCategory: string | null;
};

type EntryData = {
    id: string;
    entryDate: string;
    rawText: string;
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
                const res = await fetch("/api/entries/today");
                if (!res.ok) throw new Error("Failed to load entry");

                const data = await res.json();
                if (data.exists && data.entry) {
                    setEntry(data.entry.rawText);
                    setEntryId(data.entry.id);
                    setEnrichment(data.entry.enrichment);
                    setLastSaved(new Date(data.entry.updatedAt));
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
    }, []);

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

        setIsSaving(true);

        try {
            const res = await fetch("/api/entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rawText: entry }),
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

        setIsEnhancing(true);

        try {
            const res = await fetch("/api/ai/enhance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entryId }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to enhance entry");
            }

            const data = await res.json();
            setEnrichment({
                aiTitle: data.aiTitle,
                aiBullets: data.aiBullets,
                aiCategory: data.aiCategory,
            });
            toast.success("Entry enhanced with AI!");
        } catch (error) {
            console.error("Enhance error:", error);
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
            )}
        </div>
    );
}
