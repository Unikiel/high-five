import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

export default function ThemeSelector() {
  const { theme, changeTheme } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { id: 'light', label: 'Light', icon: Sun },
        { id: 'dark', label: 'Dark', icon: Moon },
        { id: 'system', label: 'System', icon: Monitor }
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => changeTheme(id)}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            theme === id ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80'
          }`}
        >
          <Icon className={`w-5 h-5 ${theme === id ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
}