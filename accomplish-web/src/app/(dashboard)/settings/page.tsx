"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bell, Clock, Globe, Save } from "lucide-react";
import posthog from "posthog-js";

type Settings = {
    email_reminders_enabled: boolean;
    reminder_time: string;
    reminder_timezone: string;
    skip_weekends: boolean;
};

const TIMEZONES = [
    { value: "America/New_York", label: "Eastern Time (US)" },
    { value: "America/Chicago", label: "Central Time (US)" },
    { value: "America/Denver", label: "Mountain Time (US)" },
    { value: "America/Los_Angeles", label: "Pacific Time (US)" },
    { value: "Europe/London", label: "London (UK)" },
    { value: "Europe/Paris", label: "Paris (France)" },
    { value: "Europe/Berlin", label: "Berlin (Germany)" },
    { value: "Asia/Kolkata", label: "India (IST)" },
    { value: "Asia/Singapore", label: "Singapore" },
    { value: "Asia/Tokyo", label: "Tokyo (Japan)" },
    { value: "Australia/Sydney", label: "Sydney (Australia)" },
    { value: "UTC", label: "UTC" },
];

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>({
        email_reminders_enabled: true,
        reminder_time: "18:30",
        reminder_timezone: "UTC",
        skip_weekends: true,
    });
    const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const res = await fetch("/api/settings", {
                    headers: {
                        "x-user-timezone": localTz,
                    },
                });
                if (!res.ok) throw new Error("Failed to load settings");

                const data = await res.json();
                const resolved = {
                    ...data,
                    reminder_timezone: data.reminder_timezone || localTz || "UTC",
                };
                setSettings(resolved);
                setOriginalSettings(resolved);
            } catch (error) {
                console.error("Failed to load settings:", error);
                toast.error("Failed to load settings");
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    // Check for changes
    useEffect(() => {
        if (!originalSettings) return;
        const changed =
            settings.email_reminders_enabled !== originalSettings.email_reminders_enabled ||
            settings.reminder_time !== originalSettings.reminder_time ||
            settings.reminder_timezone !== originalSettings.reminder_timezone ||
            settings.skip_weekends !== originalSettings.skip_weekends;
        setHasChanges(changed);
    }, [settings, originalSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/settings", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                body: JSON.stringify(settings),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to save settings");
            }

            const data = await res.json();
            setSettings(data);
            setOriginalSettings(data);
            setHasChanges(false);
            posthog.capture("settings_updated", {
                email_reminders_enabled: data.email_reminders_enabled,
                reminder_timezone: data.reminder_timezone,
            });
            toast.success("Settings saved successfully!");
        } catch (error) {
            console.error("Save error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        posthog.capture("settings_viewed");
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your preferences and notification settings.
                    </p>
                </div>
                <Card className="shadow-md border-border">
                    <CardContent className="p-6 space-y-4">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your preferences and notification settings.
                </p>
            </div>

            {/* Email Reminders */}
            <Card className="shadow-md border-border">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-primary" />
                        <div>
                            <CardTitle>Email Reminders</CardTitle>
                            <CardDescription>
                                Get a gentle nudge to log your accomplishments
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-foreground">Daily Reminders</p>
                            <p className="text-sm text-muted-foreground">
                                Receive an email if you haven&apos;t logged today
                            </p>
                        </div>
                        <Button
                            variant={settings.email_reminders_enabled ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                                setSettings({
                                    ...settings,
                                    email_reminders_enabled: !settings.email_reminders_enabled,
                                })
                            }
                            className="cursor-pointer"
                        >
                            {settings.email_reminders_enabled ? "Enabled" : "Disabled"}
                        </Button>
                    </div>

                    <Separator />

                    {/* Reminder Time */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium text-foreground">Reminder Time</p>
                                <p className="text-sm text-muted-foreground">
                                    When should we remind you?
                                </p>
                            </div>
                        </div>
                        <Input
                            type="time"
                            value={settings.reminder_time}
                            onChange={(e) =>
                                setSettings({ ...settings, reminder_time: e.target.value })
                            }
                            className="w-32"
                            disabled={!settings.email_reminders_enabled}
                        />
                    </div>

                    <Separator />

                    {/* Timezone */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium text-foreground">Timezone</p>
                                <p className="text-sm text-muted-foreground">
                                    Your local timezone for scheduling
                                </p>
                            </div>
                        </div>
                        <select
                            value={settings.reminder_timezone}
                            onChange={(e) =>
                                setSettings({ ...settings, reminder_timezone: e.target.value })
                            }
                            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                            disabled={!settings.email_reminders_enabled}
                        >
                            {TIMEZONES.map((tz) => (
                                <option key={tz.value} value={tz.value}>
                                    {tz.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Separator />

                    {/* Skip Weekends */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-foreground">Skip Weekends</p>
                            <p className="text-sm text-muted-foreground">
                                Don&apos;t send reminders on Saturday and Sunday
                            </p>
                        </div>
                        <Button
                            variant={settings.skip_weekends ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                                setSettings({ ...settings, skip_weekends: !settings.skip_weekends })
                            }
                            className="cursor-pointer"
                            disabled={!settings.email_reminders_enabled}
                        >
                            {settings.skip_weekends ? "Yes" : "No"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
                {hasChanges && (
                    <span className="text-sm text-amber-500 self-center">
                        You have unsaved changes
                    </span>
                )}
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
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
                            Save Settings
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
