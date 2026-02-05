"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Calendar,
    MoreVertical,
    Edit2,
    Trash2,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    FileText,
} from "lucide-react";

type Enrichment = {
    aiTitle: string | null;
    aiBullets: string[] | null;
    aiCategory: string | null;
};

type Entry = {
    id: string;
    entryDate: string;
    rawText: string;
    createdAt: string;
    updatedAt: string;
    enrichment: Enrichment | null;
};

type Pagination = {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
};

export default function EntriesPage() {
    const router = useRouter();
    const [entries, setEntries] = useState<Entry[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch entries
    const fetchEntries = async (page: number = 1) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/entries?page=${page}&limit=20`);
            if (!res.ok) throw new Error("Failed to load entries");

            const data = await res.json();
            setEntries(data.entries);
            setPagination(data.pagination);
        } catch (error) {
            console.error("Failed to load entries:", error);
            toast.error("Failed to load entries. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const truncateText = (text: string, maxLength: number = 150) => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength).trim() + "...";
    };

    const handleDelete = async () => {
        if (!entryToDelete) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/entries/${entryToDelete}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to delete entry");
            }

            setEntries(entries.filter((e) => e.id !== entryToDelete));
            setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
            toast.success("Entry deleted successfully");
        } catch (error) {
            console.error("Delete error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to delete entry");
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
            setEntryToDelete(null);
        }
    };

    const handlePageChange = (newPage: number) => {
        fetchEntries(newPage);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold text-foreground">Past Entries</h1>
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold text-foreground">Past Entries</h1>
                <Card>
                    <CardContent className="p-12 text-center">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            No entries yet
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            Start logging your daily accomplishments to see them here.
                        </p>
                        <Button
                            onClick={() => router.push("/dashboard")}
                            className="bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white cursor-pointer"
                        >
                            Log Today's Entry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Past Entries</h1>
                <span className="text-sm text-muted-foreground">
                    {pagination.total} {pagination.total === 1 ? "entry" : "entries"}
                </span>
            </div>

            {/* Entries List */}
            <div className="space-y-4">
                {entries.map((entry) => (
                    <Card
                        key={entry.id}
                        className="card-hover shadow-md border-border cursor-pointer"
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        {formatDate(entry.entryDate)}
                                    </div>
                                    {entry.enrichment && (
                                        <Badge variant="secondary" className="text-xs">
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            AI Enhanced
                                        </Badge>
                                    )}
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            className="cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/dashboard?date=${entry.entryDate}`);
                                            }}
                                        >
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="cursor-pointer text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEntryToDelete(entry.id);
                                                setDeleteDialogOpen(true);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Entry Title (if AI enhanced) */}
                            {entry.enrichment?.aiTitle && (
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    {entry.enrichment.aiTitle}
                                </h3>
                            )}

                            {/* Entry Content */}
                            <p className="text-foreground leading-relaxed">
                                {expandedId === entry.id
                                    ? entry.rawText
                                    : truncateText(entry.rawText)}
                            </p>

                            {entry.rawText.length > 150 && (
                                <button
                                    className="text-sm text-primary hover:text-primary/80 mt-2 font-medium cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedId(expandedId === entry.id ? null : entry.id);
                                    }}
                                >
                                    {expandedId === entry.id ? "Show less" : "Show more"}
                                </button>
                            )}

                            {/* Category Badge */}
                            {entry.enrichment?.aiCategory && (
                                <div className="mt-4">
                                    <Badge variant="outline" className="text-xs">
                                        {entry.enrichment.aiCategory}
                                    </Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={() => handlePageChange(pagination.page - 1)}
                        className="cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {pagination.page} of{" "}
                        {Math.ceil(pagination.total / pagination.limit)}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasMore}
                        onClick={() => handlePageChange(pagination.page + 1)}
                        className="cursor-pointer"
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Entry</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this entry? This action cannot be
                            undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            className="cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="cursor-pointer"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
