'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlusCircle, Upload, FileSpreadsheet, ArrowLeft, CheckCircle2,
  AlertCircle, Download, Loader2, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const EQUIPMENT_TYPES = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Power Only']
const SOURCES = ['Manual', 'DAT', 'Truckstop', 'Convoy', 'Uber Freight', 'Direct Broker', 'Other']

const EMPTY_FORM = {
  origin_city: '', origin_state: '',
  dest_city: '', dest_state: '',
  posted_rate: '', miles: '',
  equipment_type: 'Dry Van',
  weight: '40000',
  broker_name: '', broker_phone: '',
  pickup_date: '',
  source: 'Manual',
}

type FormState = typeof EMPTY_FORM

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

/* ─────────────────────────── MANUAL ENTRY TAB ─────────────────────────── */
function ManualEntryTab() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  const set = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch('/api/add-load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult({ success: true })
        setForm(EMPTY_FORM)
      } else {
        setResult({ error: data.error || 'Failed to add load' })
      }
    } catch {
      setResult({ error: 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Origin / Destination */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-0">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origin</p>
            <Field label="City" required>
              <Input value={form.origin_city} onChange={(e) => set('origin_city', e.target.value)} placeholder="Atlanta" required />
            </Field>
            <Field label="State" required>
              <Input value={form.origin_state} onChange={(e) => set('origin_state', e.target.value)} placeholder="GA" maxLength={2} className="uppercase" required />
            </Field>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination</p>
            <Field label="City" required>
              <Input value={form.dest_city} onChange={(e) => set('dest_city', e.target.value)} placeholder="Dallas" required />
            </Field>
            <Field label="State" required>
              <Input value={form.dest_state} onChange={(e) => set('dest_state', e.target.value)} placeholder="TX" maxLength={2} className="uppercase" required />
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* Rate / Miles / Pickup */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Posted Rate ($)" required>
          <Input type="number" min="0" step="0.01" value={form.posted_rate} onChange={(e) => set('posted_rate', e.target.value)} placeholder="3200" required />
        </Field>
        <Field label="Miles" required>
          <Input type="number" min="1" value={form.miles} onChange={(e) => set('miles', e.target.value)} placeholder="780" required />
        </Field>
        <Field label="Pickup Date" required>
          <Input type="date" value={form.pickup_date} onChange={(e) => set('pickup_date', e.target.value)} required />
        </Field>
      </div>

      {/* Equipment / Weight */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Equipment Type" required>
          <Select value={form.equipment_type} onValueChange={(v) => set('equipment_type', v || 'Dry Van')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EQUIPMENT_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Weight (lbs)">
          <Input type="number" min="0" value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="40000" />
        </Field>
      </div>

      {/* Broker */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Broker / Company" required>
          <Input value={form.broker_name} onChange={(e) => set('broker_name', e.target.value)} placeholder="TQL Logistics" required />
        </Field>
        <Field label="Broker Phone">
          <Input value={form.broker_phone} onChange={(e) => set('broker_phone', e.target.value)} placeholder="555-0201" />
        </Field>
        <Field label="Source">
          <Select value={form.source} onValueChange={(v) => set('source', v || 'Manual')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Result */}
      {result && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm',
          result.success
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
            : 'border-destructive/30 bg-destructive/10 text-destructive'
        )}>
          {result.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {result.success ? 'Load added successfully!' : result.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
          {submitting ? 'Adding…' : 'Add Load'}
        </Button>
        {result?.success && (
          <Button type="button" variant="outline" onClick={() => router.push('/loads')}>
            View All Loads
          </Button>
        )}
      </div>
    </form>
  )
}

/* ─────────────────────────── EXCEL IMPORT TAB ─────────────────────────── */
function ExcelImportTab() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted?: number; errors?: { row: number; error: string }[] } | null>(null)

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      alert('Please upload an .xlsx, .xls, or .csv file')
      return
    }
    setFile(f)
    setResult(null)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  async function handleImport() {
    if (!file) return
    setImporting(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/import-loads', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setResult({ inserted: data.inserted, errors: data.errors })
        if (!data.errors?.length) setFile(null)
      } else {
        alert(data.error || 'Import failed')
      }
    } catch {
      alert('Network error')
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const headers = [
      'origin_city', 'origin_state', 'dest_city', 'dest_state',
      'posted_rate', 'miles', 'equipment_type', 'weight',
      'broker_name', 'broker_phone', 'pickup_date', 'source'
    ]
    const example = [
      'Atlanta', 'GA', 'Dallas', 'TX',
      '3200', '780', 'Dry Van', '42000',
      'TQL Logistics', '555-0201', '2025-07-15', 'DAT'
    ]
    const csv = [headers.join(','), example.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'loads-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Template download */}
      <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Need a template?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Download the CSV template with required columns</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 shrink-0">
          <Download className="h-3.5 w-3.5" />
          Download Template
        </Button>
      </div>

      {/* Required columns legend */}
      <div className="rounded-lg border border-border bg-card/40 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">Required columns</p>
        <p><span className="font-mono text-foreground">origin_city, origin_state, dest_city, dest_state, posted_rate, miles, broker_name, pickup_date</span></p>
        <p className="pt-1 font-semibold text-foreground">Optional columns</p>
        <p><span className="font-mono text-foreground">equipment_type, weight, broker_phone, source</span></p>
        <p className="pt-1">Header names are flexible — "Origin City", "From City", "Pickup City" all work.</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <FileSpreadsheet className={cn('h-10 w-10', dragging ? 'text-primary' : 'text-muted-foreground')} />
        {file ? (
          <div className="text-center">
            <p className="font-semibold text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-medium text-foreground">Drop your file here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse — .xlsx, .xls, .csv</p>
          </div>
        )}
      </div>

      {/* File selected — clear + import */}
      {file && (
        <div className="flex gap-3">
          <Button onClick={handleImport} disabled={importing} className="gap-2">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? 'Importing…' : 'Import Loads'}
          </Button>
          <Button variant="outline" onClick={() => { setFile(null); setResult(null) }} className="gap-2">
            <X className="h-4 w-4" /> Clear
          </Button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-2">
          <div className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm',
            result.inserted
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
          )}>
            {result.inserted
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>
              {result.inserted
                ? `${result.inserted} load${result.inserted !== 1 ? 's' : ''} imported successfully`
                : 'No loads were imported'}
              {result.errors && result.errors.length > 0 ? ` — ${result.errors.length} row(s) had errors` : ''}
            </span>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs space-y-1">
              <p className="font-semibold text-destructive">Row errors:</p>
              {result.errors.map((e) => (
                <p key={e.row} className="text-muted-foreground">
                  <span className="font-mono text-foreground">Row {e.row}:</span> {e.error}
                </p>
              ))}
            </div>
          )}
          {(result.inserted ?? 0) > 0 && (
            <Button variant="outline" size="sm" onClick={() => router.push('/loads')}>
              View Imported Loads
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── PAGE ─────────────────────────── */
export default function AddLoadPage() {
  const router = useRouter()

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 -ml-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-foreground">Add Loads</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enter loads manually one at a time, or bulk-import from an Excel/CSV file.
        </p>
      </div>

      <Tabs defaultValue="manual">
        <TabsList className="w-full">
          <TabsTrigger value="manual" className="flex-1 gap-2">
            <PlusCircle className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="excel" className="flex-1 gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import from Excel / CSV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-5">
          <ManualEntryTab />
        </TabsContent>

        <TabsContent value="excel" className="mt-5">
          <ExcelImportTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
