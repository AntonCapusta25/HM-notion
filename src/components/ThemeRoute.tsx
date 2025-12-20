import { useTheme } from '../contexts/ThemeContext';
import { ReactNode } from 'react';

interface ThemeRouteProps {
    standard: ReactNode;
    premium: ReactNode;
}

export const ThemeRoute = ({ standard, premium }: ThemeRouteProps) => {
    const { theme } = useTheme();
    const isPremium = theme === 'dark'; // Or logic to determine premium status

    return isPremium ? premium : standard;
};
