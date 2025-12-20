import { useState, useMemo } from 'react';
import { Search, Settings, LogOut, Menu, X, Bell, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationCenter } from '../NotificationCenter';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
    onToggleSidebar?: () => void;
}

export const PremiumHeader = ({ onToggleSidebar }: HeaderProps) => {
    const { user, logout } = useAuth();
    const { profile } = useProfile();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const getInitials = () => {
        if (profile?.name) {
            return profile.name.split(' ').map(name => name.charAt(0).toUpperCase()).slice(0, 2).join('');
        }
        if (user?.email) {
            const emailName = user.email.split('@')[0];
            return (emailName.charAt(0) + (emailName.charAt(1) || '')).toUpperCase();
        }
        return 'U';
    };

    return (
        <header className="fixed top-4 right-4 left-4 md:left-[280px] z-30 h-16 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/5 shadow-2xl transition-all duration-300 flex items-center px-4 justify-between">
            {/* Mobile Toggle */}
            <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="text-white">
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            {/* Title / Breadcrumbs (Placeholder) */}
            <div className="hidden md:flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white tracking-tight">Dashboard</h1>
                <span className="text-white/20">/</span>
                <span className="text-white/60 text-sm">Overview</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                {/* Theme Toggle (Premium Switch) */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>

                <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

                {/* Notifications (Simplified) */}
                <button className="relative p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-black"></span>
                </button>

                {/* Profile */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
                            <span className="text-sm font-medium text-white/90 group-hover:text-white pl-2">
                                {profile?.name || 'User'}
                            </span>
                            <Avatar className="h-8 w-8 ring-1 ring-white/20">
                                <AvatarFallback className="bg-gradient-to-tr from-indigo-500 to-purple-500 text-white text-xs">
                                    {getInitials()}
                                </AvatarFallback>
                            </Avatar>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0 bg-[#1c1c1e] border-white/10 text-white" align="end">
                        {/* Simple Menu */}
                        <div className="p-2 space-y-1">
                            <Button variant="ghost" size="sm" className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10" onClick={() => navigate('/settings')}>
                                <Settings className="h-4 w-4 mr-2" /> Settings
                            </Button>
                            <Button variant="ghost" size="sm" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-white/5" onClick={() => logout()}>
                                <LogOut className="h-4 w-4 mr-2" /> Sign Out
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </header>
    );
};
