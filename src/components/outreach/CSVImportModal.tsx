// CSVImportModal.tsx - Component for importing leads from CSV files
import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download,
  ArrowRight,
  X,
  Eye,
  RefreshCw
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import Papa from 'papaparse'
import { useOutreachStore } from '@/hooks/useOutreachStore'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface CSVImportModalProps {
  open: boolean
  onClose: () => void
  workspaceId: string
}

interface CSVColumn {
  index: number
  header: string
  sample: string
  mapped: string
}

interface MappingConfig {
  [csvColumn: string]: string
}

const REQUIRED_FIELDS = ['name', 'email']
const OPTIONAL_FIELDS = [
  'company',
  'position', 
  'industry',
  'phone',
  'website',
  'linkedin_url',
  'twitter_url',
  'location',
  'company_size',
  'revenue_range',
  'notes'
]

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]

export default function CSVImportModal({ open, onClose, workspaceId }: CSVImportModalProps) {
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([])
  const [mappingConfig, setMappingConfig] = useState<MappingConfig>({})
  const [targetSegmentId, setTargetSegmentId] = useState<string>('')
  const [previewData, setPreviewData] = useState<any[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<{
    successful: number
    failed: number
    errors: string[]
  } | null>(null)

  const { user } = useAuthStore()
  const { segments, uploadCSV, processCSVImport, createLead } = useOutreachStore()
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive"
      })
      return
    }

    setFile(file)
    
    // Parse CSV to preview
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][]
        const headers = data[0] || []
        const rows = data.slice(1).filter(row => row.some(cell => cell?.trim()))

        setCsvData(rows)
        setCsvColumns(headers.map((header, index) => ({
          index,
          header: header.trim(),
          sample: rows[0]?.[index]?.trim() || '',
          mapped: ''
        })))

        // Auto-detect common mappings
        const autoMapping: MappingConfig = {}
        headers.forEach((header, index) => {
          const lowerHeader = header.toLowerCase().trim()
          if (lowerHeader.includes('name') || lowerHeader.includes('full name')) {
            autoMapping[index] = 'name'
          } else if (lowerHeader.includes('email')) {
            autoMapping[index] = 'email'
          } else if (lowerHeader.includes('company') || lowerHeader.includes('organization')) {
            autoMapping[index] = 'company'
          } else if (lowerHeader.includes('position') || lowerHeader.includes('title') || lowerHeader.includes('job')) {
            autoMapping[index] = 'position'
          } else if (lowerHeader.includes('phone')) {
            autoMapping[index] = 'phone'
          } else if (lowerHeader.includes('website') || lowerHeader.includes('url')) {
            autoMapping[index] = 'website'
          } else if (lowerHeader.includes('linkedin')) {
            autoMapping[index] = 'linkedin_url'
          } else if (lowerHeader.includes('industry')) {
            autoMapping[index] = 'industry'
          } else if (lowerHeader.includes('location') || lowerHeader.includes('city')) {
            autoMapping[index] = 'location'
          }
        })

        setMappingConfig(autoMapping)
        setCurrentStep('mapping')
      },
      header: false,
      skipEmptyLines: true,
      error: (error) => {
        toast({
          title: "Error parsing CSV",
          description: error.message,
          variant: "destructive"
        })
      }
    })
  }, [toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  const handleMappingChange = (columnIndex: number, fieldName: string) => {
    setMappingConfig(prev => {
      const newMapping = { ...prev }
      
      // Remove the field from other columns if it was already mapped
      Object.keys(newMapping).forEach(key => {
        if (newMapping[key] === fieldName && key !== columnIndex.toString()) {
          delete newMapping[key]
        }
      })
      
      if (fieldName === '') {
        delete newMapping[columnIndex]
      } else {
        newMapping[columnIndex] = fieldName
      }
      
      return newMapping
    })
  }

  const validateMapping = () => {
    const mappedFields = Object.values(mappingConfig)
    const missingRequired = REQUIRED_FIELDS.filter(field => !mappedFields.includes(field))
    
    if (missingRequired.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please map the following required fields: ${missingRequired.join(', ')}`,
        variant: "destructive"
      })
      return false
    }
    
    return true
  }

  const generatePreview = () => {
    if (!validateMapping()) return

    const preview = csvData.slice(0, 5).map(row => {
      const lead: any = {}
      
      Object.entries(mappingConfig).forEach(([columnIndex, fieldName]) => {
        const value = row[parseInt(columnIndex)]?.trim()
        if (value) {
          lead[fieldName] = value
        }
      })
      
      return lead
    })

    setPreviewData(preview)
    setCurrentStep('preview')
  }

  const startImport = async () => {
    if (!file || !user) return

    try {
      setCurrentStep('importing')
      setImportProgress(0)

      // Upload CSV file
      const fileUrl = await uploadCSV(file, workspaceId)
      
      setImportProgress(20)

      // Process import
      let successfulImports = 0
      let failedImports = 0
      const errors: string[] = []

      for (let i = 0; i < csvData.length; i++) {
        try {
          const row = csvData[i]
          const leadData: any = {
            workspace_id: workspaceId,
            created_by: user.id,
            source: 'csv_import',
            segment_id: targetSegmentId || undefined
          }

          // Map CSV data to lead fields
          Object.entries(mappingConfig).forEach(([columnIndex, fieldName]) => {
            const value = row[parseInt(columnIndex)]?.trim()
            if (value) {
              leadData[fieldName] = value
            }
          })

          // Validate required fields
          if (!leadData.name || !leadData.email) {
            throw new Error('Missing required fields (name or email)')
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(leadData.email)) {
            throw new Error('Invalid email format')
          }

          await createLead(leadData)
          successfulImports++

        } catch (error: any) {
          failedImports++
          errors.push(`Row ${i + 2}: ${error.message}`)
        }

        setImportProgress(20 + (i / csvData.length) * 70)
      }

      // Save import record
      await processCSVImport({
        file_name: file.name,
        file_url: fileUrl,
        total_rows: csvData.length,
        successful_imports: successfulImports,
        failed_imports: failedImports,
        target_segment_id: targetSegmentId || null,
        mapping_config: mappingConfig,
        error_log: errors.length > 0 ? errors.join('\n') : null,
        workspace_id: workspaceId,
        created_by: user.id
      })

      setImportResults({
        successful: successfulImports,
        failed: failedImports,
        errors: errors.slice(0, 10) // Show only first 10 errors
      })

      setImportProgress(100)
      setCurrentStep('complete')

      toast({
        title: "Import completed",
        description: `Successfully imported ${successfulImports} leads${failedImports > 0 ? ` (${failedImports} failed)` : ''}`,
      })

    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive"
      })
      setCurrentStep('preview')
    }
  }

  const resetImport = () => {
    setCurrentStep('upload')
    setFile(null)
    setCsvData([])
    setCsvColumns([])
    setMappingConfig({})
    setTargetSegmentId('')
    setPreviewData([])
    setImportProgress(0)
    setImportResults(null)
  }

  const handleClose = () => {
    resetImport()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Leads from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import leads into your workspace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {['upload', 'mapping', 'preview', 'importing', 'complete'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === step 
                    ? 'bg-blue-600 text-white' 
                    : index < ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(currentStep)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {index < ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(currentStep) ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 4 && (
                  <div className={`
                    w-12 h-0.5 mx-2
                    ${index < ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(currentStep)
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                    }
                  `} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {currentStep === 'upload' && (
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Select a CSV file containing your lead data. The first row should contain column headers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  `}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-blue-600 font-medium">Drop the CSV file here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">
                        Drag and drop a CSV file here, or <span className="text-blue-600 font-medium">browse</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Supported format: .csv (max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">{file.name}</p>
                          <p className="text-sm text-green-600">
                            {(file.size / 1024).toFixed(1)} KB • {csvData.length} rows
                          </p>
                        </div>
                      </div>
                      <Button onClick={() => setFile(null)} variant="ghost" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <h4 className="font-medium mb-3">CSV Format Requirements:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium text-green-600 mb-2">Required Columns:</h5>
                      <ul className="space-y-1 text-gray-600">
                        <li>• Name (full name)</li>
                        <li>• Email (valid email address)</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-600 mb-2">Optional Columns:</h5>
                      <ul className="space-y-1 text-gray-600">
                        <li>• Company</li>
                        <li>• Position/Job Title</li>
                        <li>• Phone</li>
                        <li>• Website</li>
                        <li>• LinkedIn URL</li>
                        <li>• Industry</li>
                        <li>• Location</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'mapping' && (
            <Card>
              <CardHeader>
                <CardTitle>Map CSV Columns</CardTitle>
                <CardDescription>
                  Match your CSV columns to the appropriate lead fields
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {csvColumns.map((column, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 border rounded-lg">
                      <div>
                        <Label className="font-medium">{column.header}</Label>
                        <p className="text-sm text-gray-500 truncate">
                          Sample: {column.sample || 'No data'}
                        </p>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-gray-400 mx-auto" />
                      
                      <Select
                        value={mappingConfig[index] || ''}
                        onValueChange={(value) => handleMappingChange(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Don't import</SelectItem>
                          {REQUIRED_FIELDS.map(field => (
                            <SelectItem key={field} value={field}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-red-600 border-red-600">
                                  Required
                                </Badge>
                                {field.replace('_', ' ').charAt(0).toUpperCase() + field.replace('_', ' ').slice(1)}
                              </div>
                            </SelectItem>
                          ))}
                          {OPTIONAL_FIELDS.map(field => (
                            <SelectItem key={field} value={field}>
                              {field.replace('_', ' ').charAt(0).toUpperCase() + field.replace('_', ' ').slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div>
                        {mappingConfig[index] && (
                          <Badge variant={REQUIRED_FIELDS.includes(mappingConfig[index]) ? 'destructive' : 'secondary'}>
                            {REQUIRED_FIELDS.includes(mappingConfig[index]) ? 'Required' : 'Optional'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Label htmlFor="segment">Target Segment (Optional)</Label>
                  <Select value={targetSegmentId} onValueChange={setTargetSegmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a segment to assign leads to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map(segment => (
                        <SelectItem key={segment.id} value={segment.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: segment.color }}
                            />
                            {segment.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                    Back
                  </Button>
                  <Button onClick={generatePreview}>
                    Preview Import
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'preview' && (
            <Card>
              <CardHeader>
                <CardTitle>Preview Import</CardTitle>
                <CardDescription>
                  Review the first 5 leads before importing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        {Object.values(mappingConfig).map(field => (
                          <th key={field} className="border border-gray-300 p-2 text-left font-medium">
                            {field.replace('_', ' ').charAt(0).toUpperCase() + field.replace('_', ' ').slice(1)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((lead, index) => (
                        <tr key={index}>
                          {Object.values(mappingConfig).map(field => (
                            <td key={field} className="border border-gray-300 p-2">
                              {lead[field] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Import Summary</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">Total rows:</span> {csvData.length}
                    </div>
                    <div>
                      <span className="text-blue-600">Target segment:</span> {
                        targetSegmentId 
                          ? segments.find(s => s.id === targetSegmentId)?.name || 'Unknown'
                          : 'None'
                      }
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep('mapping')}>
                    Back to Mapping
                  </Button>
                  <Button onClick={startImport}>
                    Start Import
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'importing' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Importing Leads
                </CardTitle>
                <CardDescription>
                  Processing your CSV file and creating lead records...
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Import Progress</span>
                    <span>{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                </div>

                <div className="text-center text-gray-600">
                  <p>Please don't close this window while the import is in progress.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'complete' && importResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Import Complete
                </CardTitle>
                <CardDescription>
                  Your CSV import has been processed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {importResults.successful}
                    </div>
                    <div className="text-green-800">Leads imported successfully</div>
                  </div>

                  {importResults.failed > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-600">
                        {importResults.failed}
                      </div>
                      <div className="text-red-800">Leads failed to import</div>
                    </div>
                  )}
                </div>

                {importResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <Label>Import Errors:</Label>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                      {importResults.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-700">
                          {error}
                        </p>
                      ))}
                      {importResults.failed > importResults.errors.length && (
                        <p className="text-sm text-red-600 italic">
                          ... and {importResults.failed - importResults.errors.length} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={resetImport}>
                    Import Another File
                  </Button>
                  <Button onClick={handleClose}>
                    Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
