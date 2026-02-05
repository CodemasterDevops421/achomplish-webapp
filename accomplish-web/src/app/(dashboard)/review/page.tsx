"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Copy, Download, Calendar, Clock, ArrowLeft, Sparkles } from "lucide-react";
import posthog from "posthog-js";
import { format, subMonths } from "date-fns";

export default function ReviewPage() {
  const router = useRouter();
  const [entryCount, setEntryCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(true);
  const [range, setRange] = useState<"3m" | "6m" | "custom">("3m");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  useEffect(() => {
    posthog.capture("generator_started", { type: "review" });
    loadEntryCount();
  }, []);

  const loadEntryCount = async () => {
    try {
      const res = await fetch("/api/entries?page=1&limit=1");
      if (!res.ok) throw new Error("Failed to load entries");
      const data = await res.json();
      setEntryCount(data.pagination?.total || 0);
    } catch (error) {
      console.error("Failed to load entry count:", error);
    } finally {
      setIsLoadingCount(false);
    }
  };

  const getDateRange = (): { start: string; end: string } => {
    const end = format(new Date(), "yyyy-MM-dd");
    if (range === "3m") {
      return { start: format(subMonths(new Date(), 3), "yyyy-MM-dd"), end };
    }
    if (range === "6m") {
      return { start: format(subMonths(new Date(), 6), "yyyy-MM-dd"), end };
    }
    return { start: customStart, end: customEnd };
  };

  const handleGenerate = async () => {
    const { start, end } = getDateRange();
    if (!start || !end) {
      toast.error("Please select a date range");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range_start: start, range_end: end }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate review");
      }

      const data = await res.json();
      setOutput(data.output_markdown);
      setGeneratedId(data.id);
      posthog.capture("generator_succeeded", { type: "review", entry_count: data.entry_count });
      toast.success("Performance review generated!");
    } catch (error) {
      console.error("Generate error:", error);
      posthog.capture("generator_failed", { type: "review", error: String(error) });
      toast.error(error instanceof Error ? error.message : "Failed to generate review");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      posthog.capture("generator_output_copied", { type: "review" });
      toast.success("Copied to clipboard!");
    }
  };

  const handleDownload = () => {
    if (output) {
      const blob = new Blob([output], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `performance-review-${format(new Date(), "yyyy-MM-dd")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      posthog.capture("generator_output_downloaded", { type: "review" });
      toast.success("Downloaded!");
    }
  };

  if (isLoadingCount) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (entryCount < 5) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance Review Generator</h1>
          <p className="text-muted-foreground mt-1">
            Generate a comprehensive performance review from your accomplishments
          </p>
        </div>

        <Card className="shadow-md border-border">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Not enough entries yet
            </h3>
            <p className="text-muted-foreground mb-4">
              You need at least 5 entries to generate a meaningful review. You currently have{" "}
              {entryCount}.
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white cursor-pointer"
            >
              Log More Entries
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/entries")}
          className="cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance Review Generator</h1>
          <p className="text-muted-foreground text-sm">{entryCount} entries available</p>
        </div>
      </div>

      <Card className="shadow-md border-border">
        <CardHeader>
          <CardTitle className="text-lg">Select Time Range</CardTitle>
          <CardDescription>Choose the period to include in your review</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button
              variant={range === "3m" ? "default" : "outline"}
              onClick={() => setRange("3m")}
              className="cursor-pointer"
            >
              <Clock className="w-4 h-4 mr-2" />
              Last 3 months
            </Button>
            <Button
              variant={range === "6m" ? "default" : "outline"}
              onClick={() => setRange("6m")}
              className="cursor-pointer"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Last 6 months
            </Button>
            <Button
              variant={range === "custom" ? "default" : "outline"}
              onClick={() => setRange("custom")}
              className="cursor-pointer"
            >
              Custom Range
            </Button>
          </div>

          {range === "custom" && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background mt-1"
                />
              </div>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (range === "custom" && (!customStart || !customEnd))}
            className="bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white cursor-pointer w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Review
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {output && (
        <Card className="shadow-md border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle>Your Performance Review</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="cursor-pointer">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="cursor-pointer">
                  <Download className="w-4 h-4 mr-2" />
                  Download .md
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              You can edit this text directly above before copying or downloading.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
