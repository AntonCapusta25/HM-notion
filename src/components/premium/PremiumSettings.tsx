import { useState, useEffect } from 'react';
import { Layout } from '../Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Bell, Palette, Shield, Download, AlertCircle, Trash2, TestTube, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';

export const PremiumSettings = () => {
    const { toast } = useToast();
    const { user, signOut } = useAuth();
    const { profile, loading: profileLoading, error: profileError } = useProfile();

    const [isUpdating, setIsUpdating] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [settings, setSettings] = useState({
        name: '',
        email: '',
        department: 'Operations',
        role: 'member',
        notifications: {
            email: true,
            desktop: true,
            taskAssigned: true,
            taskUpdated: true,
            comments: true,
            dueSoon: true
        },
        theme: 'dark', // Force dark for premium? Or keep logic?
        timezone: 'Asia/Dubai',
        language: 'en'
    });

    useEffect(() => {
        const savedPreferences = localStorage.getItem('userPreferences');
        if (savedPreferences) {
            try {
                const prefs = JSON.parse(savedPreferences);
                setSettings(prev => ({
                    ...prev,
                    theme: prefs.theme || prev.theme,
                    timezone: prefs.timezone || prev.timezone,
                    language: prefs.language || prev.language
                }));
            } catch (error) {
                console.error('Error parsing saved preferences:', error);
            }
        }
    }, []);

    useEffect(() => {
        if (user && profile) {
            setSettings(prev => ({
                ...prev,
                name: profile.name || user.email?.split('@')[0] || '',
                email: user.email || '',
                department: profile.department || prev.department,
                role: profile.role || prev.role,
            }));
        }
    }, [user, profile]);

    useEffect(() => {
        if (profile?.notification_preferences) {
            setSettings(prev => ({
                ...prev,
                notifications: {
                    email: true,
                    desktop: true,
                    taskAssigned: true,
                    taskUpdated: true,
                    comments: true,
                    dueSoon: true,
                    ...profile.notification_preferences
                }
            }));
        }
    }, [profile]);

    const updateSetting = (path: string, value: any) => {
        setSettings(prev => {
            const keys = path.split('.');
            const updated = { ...prev };
            let current: any = updated;

            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...current[keys[i]] };
                current = current[keys[i]];
            }

            current[keys[keys.length - 1]] = value;
            return updated;
        });
    };

    const saveSettings = async () => {
        if (!user) return;
        setIsUpdating(true);

        try {
            const { error } = await supabase
                .from('users')
                .upsert({
                    id: user.id,
                    name: settings.name,
                    email: settings.email,
                    department: settings.department,
                    role: settings.role,
                    notification_preferences: settings.notifications,
                });

            if (error) throw error;

            const uiPreferences = {
                theme: settings.theme,
                timezone: settings.timezone,
                language: settings.language
            };

            localStorage.setItem('userPreferences', JSON.stringify(uiPreferences));

            window.dispatchEvent(new StorageEvent('storage', {
                key: 'userPreferences',
                newValue: JSON.stringify(uiPreferences)
            }));

            toast({
                title: "Settings saved",
                description: "Your preferences have been updated.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save settings.",
                variant: "destructive"
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const getInitials = () => {
        if (settings.name) {
            return settings.name.split(' ').map(name => name.charAt(0).toUpperCase()).slice(0, 2).join('');
        }
        return user?.email?.substring(0, 2).toUpperCase() || 'U';
    };

    const glassCard = "bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden";
    const glassInput = "bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-homemade-orange/50 focus:ring-homemade-orange/20";
    const glassSelectTrigger = "bg-white/5 border-white/10 text-white";

    return (
        <Layout>
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
                        <p className="text-gray-400 mt-1">Manage your account and preferences</p>
                    </div>
                    <Button
                        onClick={saveSettings}
                        className="bg-homemade-orange hover:bg-homemade-orange-dark text-white"
                        disabled={isUpdating}
                    >
                        {isUpdating ? <span className="animate-spin mr-2">⏳</span> : <Check className="h-4 w-4 mr-2" />}
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <Card className={`${glassCard} lg:col-span-2`}>
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <User className="h-5 w-5 text-homemade-orange" />
                                Profile Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6">
                            <div className="flex items-center gap-6">
                                <div className="relative group">
                                    <Avatar className="h-20 w-20 ring-4 ring-white/5">
                                        <AvatarFallback className="bg-homemade-orange text-white text-xl">
                                            {getInitials()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <span className="text-xs text-white">Change</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h3 className="text-lg font-medium text-white">{settings.name || 'Your Name'}</h3>
                                    <p className="text-sm text-gray-400">{settings.role} • {settings.department}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={settings.name}
                                        onChange={(e) => updateSetting('name', e.target.value)}
                                        className={glassInput}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                                    <Input
                                        id="email"
                                        value={settings.email}
                                        disabled
                                        className={`${glassInput} opacity-50 cursor-not-allowed`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department" className="text-gray-300">Department</Label>
                                    <Select value={settings.department} onValueChange={(value) => updateSetting('department', value)}>
                                        <SelectTrigger className={glassSelectTrigger}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                            <SelectItem value="Operations">Operations</SelectItem>
                                            <SelectItem value="Marketing">Marketing</SelectItem>
                                            <SelectItem value="Technology">Technology</SelectItem>
                                            <SelectItem value="Finance">Finance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preferences Card */}
                    <div className="space-y-6">
                        <Card className={glassCard}>
                            <CardHeader className="border-b border-white/5">
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <Palette className="h-5 w-5 text-homemade-orange" />
                                    Appearance
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-6">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">Theme</Label>
                                    <Select value={settings.theme} onValueChange={(value) => updateSetting('theme', value)}>
                                        <SelectTrigger className={glassSelectTrigger}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                            <SelectItem value="light">Light Mode</SelectItem>
                                            <SelectItem value="dark">Dark Mode</SelectItem>
                                            <SelectItem value="system">System Default</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={glassCard}>
                            <CardHeader className="border-b border-white/5">
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <Bell className="h-5 w-5 text-homemade-orange" />
                                    Notifications
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-6">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="email-notif" className="text-gray-300">Email Alerts</Label>
                                    <Switch
                                        id="email-notif"
                                        checked={settings.notifications.email}
                                        onCheckedChange={(checked) => updateSetting('notifications.email', checked)}
                                        className="data-[state=checked]:bg-homemade-orange"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="desktop-notif" className="text-gray-300">Desktop Push</Label>
                                    <Switch
                                        id="desktop-notif"
                                        checked={settings.notifications.desktop}
                                        onCheckedChange={(checked) => updateSetting('notifications.desktop', checked)}
                                        className="data-[state=checked]:bg-homemade-orange"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
