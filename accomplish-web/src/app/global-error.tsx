"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global error:", error);
    }, [error]);

    return (
        <html>
            <body className="min-h-screen bg-[#F0FDFA] flex items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-lg">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
                        <h1 className="text-2xl font-bold text-[#134E4A] mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-[#5F9EA0] mb-6">
                            We encountered an unexpected error. Don't worry, your data is safe.
                        </p>

                        {process.env.NODE_ENV === "development" && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                                <p className="text-sm font-mono text-red-800 break-all">
                                    {error.message}
                                </p>
                                {error.digest && (
                                    <p className="text-xs text-red-600 mt-2">
                                        Error ID: {error.digest}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <Button
                                onClick={reset}
                                variant="outline"
                                className="cursor-pointer"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                            <Link href="/">
                                <Button className="bg-[#0D9488] hover:bg-[#0D9488]/90 text-white cursor-pointer">
                                    <Home className="w-4 h-4 mr-2" />
                                    Go Home
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </body>
        </html>
    );
}
