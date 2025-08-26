
import { useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

const shortcuts = [
  { key: 'Ctrl + K', description: 'Open search' },
  { key: 'Ctrl + N', description: 'Create new task' },
  { key: 'Ctrl + /', description: 'Show keyboard shortcuts' },
  { key: 'Ctrl + 1', description: 'Go to Dashboard' },
  { key: 'Ctrl + 2', description: 'Go to My Tasks' },
  { key: 'Ctrl + 3', description: 'Go to Team' },
  { key: 'Ctrl + 4', description: 'Go to Calendar' },
  { key: 'Escape', description: 'Close dialog/modal' },
  { key: 'Enter', description: 'Submit form/confirm action' },
  { key: 'Tab', description: 'Navigate between elements' },
];

interface KeyboardShortcutsProps {
  onCreateTask?: () => void;
  onOpenSearch?: () => void;
}

export const KeyboardShortcuts = ({ onCreateTask, onOpenSearch }: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            onOpenSearch?.();
            break;
          case 'n':
            event.preventDefault();
            onCreateTask?.();
            break;
          case '1':
            event.preventDefault();
            window.location.href = '/';
            break;
          case '2':
            event.preventDefault();
            window.location.href = '/my-tasks';
            break;
          case '3':
            event.preventDefault();
            window.location.href = '/team';
            break;
          case '4':
            event.preventDefault();
            window.location.href = '/calendar';
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCreateTask, onOpenSearch]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <Card key={index} className="p-0">
              <CardContent className="flex justify-between items-center p-3">
                <span className="text-sm text-gray-600">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">
                  {shortcut.key}
                </kbd>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
