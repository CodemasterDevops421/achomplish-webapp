"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-lg">
                <CardContent className="p-8 text-center">
                    <FileQuestion className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Page Not Found
                    </h1>
                    <p className="text-muted-foreground mb-6">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    </p>

                    <div className="flex gap-3 justify-center">
                        <Button
                            variant="outline"
                            onClick={() => window.history.back()}
                            className="cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go Back
                        </Button>
                        <Link href="/">
                            <Button className="bg-[var(--cta)] hover:bg-[var(--cta)]/90 text-white cursor-pointer">
                                <Home className="w-4 h-4 mr-2" />
                                Go Home
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
