// TaskImportExport.tsx
import { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task } from '../types';

interface TaskImportExportProps {
  tasks: Task[];
  users: any[];
  onCreateTask: (taskData: any) => Promise<void>;
  currentUserId: string;
}

interface ImportResult {
  success: number;
  errors: { row: number; error: string; data?: any }[];
  warnings: { row: number; warning: string; data?: any }[];
}

export const TaskImportExport = ({ tasks, users, onCreateTask, currentUserId }: TaskImportExportProps) => {
  const [open, setOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export functions
  const exportToCSV = () => {
    setIsExporting(true);
    
    try {
      const headers = [
        'Title',
        'Description',
        'Status',
        'Priority',
        'Due Date',
        'Assignees (emails)',
        'Tags',
        'Workspace',
        'Created By',
        'Created At'
      ];

      const csvData = tasks.map(task => {
        // Get assignee emails
        const assigneeEmails = task.assignees 
          ? task.assignees.map(id => {
              const user = users.find(u => u.id === id);
              return user?.email || id;
            }).join(';')
          : '';

        // Get creator email
        const createdByUser = users.find(u => u.id === task.created_by);
        const createdByEmail = createdByUser?.email || task.created_by;

        return [
          `"${(task.title || '').replace(/"/g, '""')}"`,
          `"${(task.description || '').replace(/"/g, '""')}"`,
          task.status || 'todo',
          task.priority || 'medium',
          task.due_date || '',
          `"${assigneeEmails}"`,
          task.tags ? `"${task.tags.join(';')}"` : '',
          task.workspace_id || '',
          createdByEmail,
          task.created_at || ''
        ].join(',');
      });

      const csvContent = [
        headers.join(','),
        ...csvData
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `homebase-tasks-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export tasks. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    setIsExporting(true);
    
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        taskCount: tasks.length,
        tasks: tasks.map(task => ({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          assignees: task.assignees?.map(id => {
            const user = users.find(u => u.id === id);
            return user?.email || id;
          }),
          tags: task.tags,
          workspace_id: task.workspace_id,
          created_by: users.find(u => u.id === task.created_by)?.email || task.created_by,
          created_at: task.created_at,
          subtasks: task.subtasks
        }))
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `homebase-tasks-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export tasks. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Import functions
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const fileContent = await file.text();
      
      if (file.name.endsWith('.csv')) {
        await importFromCSV(fileContent);
      } else if (file.name.endsWith('.json')) {
        await importFromJSON(fileContent);
      } else {
        alert('Please select a CSV or JSON file.');
        return;
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: 0,
        errors: [{ row: 0, error: 'Failed to read file. Please check the file format.' }],
        warnings: []
      });
    } finally {
      setIsImporting(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const importFromCSV = async (csvContent: string) => {
    const result: ImportResult = { success: 0, errors: [], warnings: [] };
    
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        result.errors.push({ row: 0, error: 'CSV file must have header row and at least one data row.' });
        setImportResult(result);
        return;
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      // Validate required headers
      const requiredHeaders = ['Title'];
      const missingHeaders = requiredHeaders.filter(h => !headers.some(header => 
        header.toLowerCase().includes(h.toLowerCase())
      ));
      
      if (missingHeaders.length > 0) {
        result.errors.push({ 
          row: 0, 
          error: `Missing required columns: ${missingHeaders.join(', ')}. Found: ${headers.join(', ')}` 
        });
        setImportResult(result);
        return;
      }

      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i]);
          const rowData: any = {};
          
          headers.forEach((header, index) => {
            if (values[index] !== undefined) {
              rowData[header] = values[index];
            }
          });

          const taskData = await processImportRow(rowData, result, i + 1);
          if (taskData) {
            await onCreateTask(taskData);
            result.success++;
          }
        } catch (error) {
          result.errors.push({ 
            row: i + 1, 
            error: `Failed to process row: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }
    } catch (error) {
      result.errors.push({ 
        row: 0, 
        error: `CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }

    setImportResult(result);
  };

  const importFromJSON = async (jsonContent: string) => {
    const result: ImportResult = { success: 0, errors: [], warnings: [] };
    
    try {
      const data = JSON.parse(jsonContent);
      
      // Handle different JSON formats
      let tasks: any[] = [];
      if (Array.isArray(data)) {
        tasks = data;
      } else if (data.tasks && Array.isArray(data.tasks)) {
        tasks = data.tasks;
      } else {
        result.errors.push({ 
          row: 0, 
          error: 'JSON must contain an array of tasks or an object with a "tasks" array property.' 
        });
        setImportResult(result);
        return;
      }

      for (let i = 0; i < tasks.length; i++) {
        try {
          const taskData = await processImportRow(tasks[i], result, i + 1);
          if (taskData) {
            await onCreateTask(taskData);
            result.success++;
          }
        } catch (error) {
          result.errors.push({ 
            row: i + 1, 
            error: `Failed to process task: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      }
    } catch (error) {
      result.errors.push({ 
        row: 0, 
        error: `JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }

    setImportResult(result);
  };

  const processImportRow = async (rowData: any, result: ImportResult, rowNumber: number) => {
    // Get title (try different column names)
    const title = rowData.Title || rowData.title || rowData.name || rowData.Name;
    if (!title || !title.trim()) {
      result.errors.push({ row: rowNumber, error: 'Title is required', data: rowData });
      return null;
    }

    // Build task data
    const taskData: any = {
      title: title.trim(),
      description: rowData.Description || rowData.description || '',
      status: (rowData.Status || rowData.status || 'todo').toLowerCase(),
      priority: (rowData.Priority || rowData.priority || 'medium').toLowerCase(),
      created_by: currentUserId
    };

    // Handle workspace_id
    const workspaceId = rowData.Workspace || rowData.workspace || rowData.workspace_id || rowData.Workspace_Id;
    if (workspaceId && workspaceId.trim()) {
      taskData.workspace_id = workspaceId.trim();
    }

    // Handle due date
    const dueDate = rowData['Due Date'] || rowData.due_date || rowData.dueDate;
    if (dueDate && dueDate.trim()) {
      const parsedDate = new Date(dueDate);
      if (!isNaN(parsedDate.getTime())) {
        taskData.due_date = parsedDate.toISOString().split('T')[0];
      } else {
        result.warnings.push({ 
          row: rowNumber, 
          warning: `Invalid due date format: "${dueDate}". Date ignored.` 
        });
      }
    }

    // Handle assignees (emails)
    const assigneesStr = rowData['Assignees (emails)'] || rowData.assignees || rowData.Assignees;
    if (assigneesStr && assigneesStr.trim()) {
      const emails = assigneesStr.split(';').map((e: string) => e.trim()).filter(Boolean);
      const assigneeIds: string[] = [];
      
      for (const email of emails) {
        const user = users.find(u => u.email === email);
        if (user) {
          assigneeIds.push(user.id);
        } else {
          result.warnings.push({ 
            row: rowNumber, 
            warning: `User not found for email: "${email}". Assignment skipped.` 
          });
        }
      }
      
      if (assigneeIds.length > 0) {
        taskData.assignees = assigneeIds;
      }
    }

    // Handle tags
    const tagsStr = rowData.Tags || rowData.tags;
    if (tagsStr && tagsStr.trim()) {
      const tags = tagsStr.split(';').map((t: string) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        taskData.tags = tags;
      }
    }

    // Validate status and priority
    const validStatuses = ['todo', 'in_progress', 'done'];
    if (!validStatuses.includes(taskData.status)) {
      result.warnings.push({ 
        row: rowNumber, 
        warning: `Invalid status "${taskData.status}". Using "todo" instead.` 
      });
      taskData.status = 'todo';
    }

    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(taskData.priority)) {
      result.warnings.push({ 
        row: rowNumber, 
        warning: `Invalid priority "${taskData.priority}". Using "medium" instead.` 
      });
      taskData.priority = 'medium';
    }

    return taskData;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else if (char !== '"' || (char === '"' && line[i+1] === '"')) {
        if (char === '"' && line[i+1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          current += char;
        }
      }
    }
    
    result.push(current.trim());
    return result;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Import/Export
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import & Export Tasks</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export Tasks</TabsTrigger>
            <TabsTrigger value="import">Import Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Your Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  Export your {tasks.length} tasks to CSV or JSON format for backup or sharing.
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={exportToCSV} 
                    disabled={isExporting || tasks.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export as CSV'}
                  </Button>
                  
                  <Button 
                    onClick={exportToJSON} 
                    disabled={isExporting || tasks.length === 0}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export as JSON'}
                  </Button>
                </div>

                {tasks.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No tasks to export. Create some tasks first.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  Import tasks from CSV or JSON files. New tasks will be created in your workspace.
                </div>

                <div className="space-y-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600 mb-3">
                      Select a CSV or JSON file to import tasks
                    </div>
                    <Button 
                      onClick={handleFileSelect}
                      disabled={isImporting}
                      className="bg-homemade-orange hover:bg-homemade-orange-dark"
                    >
                      {isImporting ? 'Importing...' : 'Choose File'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>CSV Format:</strong> Must include 'Title' column. Optional: Description, Status, Priority, Due Date, Assignees (emails), Tags, Workspace.
                      <br />
                      <strong>JSON Format:</strong> Array of task objects or object with 'tasks' property.
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Import Results */}
                {importResult && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Import Complete</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                        <div className="text-gray-600">Imported</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                        <div className="text-gray-600">Errors</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{importResult.warnings.length}</div>
                        <div className="text-gray-600">Warnings</div>
                      </div>
                    </div>

                    {/* Show errors */}
                    {importResult.errors.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-medium text-red-600">Errors:</div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {importResult.errors.map((error, index) => (
                            <Alert key={index} variant="destructive">
                              <AlertDescription className="text-xs">
                                Row {error.row}: {error.error}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show warnings */}
                    {importResult.warnings.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-medium text-yellow-600">Warnings:</div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {importResult.warnings.map((warning, index) => (
                            <Alert key={index} className="border-yellow-200 bg-yellow-50">
                              <AlertDescription className="text-xs">
                                Row {warning.row}: {warning.warning}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => setImportResult(null)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Results
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
