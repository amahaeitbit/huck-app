import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/insforge'
import { getCoords } from '@/lib/geo'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    if (!rows.length) {
      return NextResponse.json({ error: 'Spreadsheet is empty' }, { status: 400 })
    }

    const admin = createServiceClient()
    const inserted: unknown[] = []
    const errors: { row: number; error: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Normalize header names (case-insensitive, trim)
      const get = (keys: string[]): string => {
        for (const key of keys) {
          for (const col of Object.keys(row)) {
            if (col.toLowerCase().trim() === key.toLowerCase()) {
              return String(row[col] ?? '').trim()
            }
          }
        }
        return ''
      }

      const origin_city = get(['origin_city', 'origin city', 'from city', 'pickup city'])
      const origin_state = get(['origin_state', 'origin state', 'from state', 'pickup state'])
      const dest_city = get(['dest_city', 'destination city', 'dest city', 'delivery city', 'to city'])
      const dest_state = get(['dest_state', 'destination state', 'dest state', 'delivery state', 'to state'])
      const posted_rate = get(['posted_rate', 'posted rate', 'rate', 'total rate', 'load rate'])
      const miles = get(['miles', 'distance', 'total miles', 'load miles'])
      const equipment_type = get(['equipment_type', 'equipment type', 'equipment', 'trailer type', 'trailer']) || 'Dry Van'
      const weight = get(['weight', 'load weight', 'lbs']) || '40000'
      const broker_name = get(['broker_name', 'broker name', 'broker', 'company', 'carrier'])
      const broker_phone = get(['broker_phone', 'broker phone', 'phone', 'contact phone'])
      const pickup_date = get(['pickup_date', 'pickup date', 'ship date', 'date'])
      const source = get(['source']) || 'Excel'

      if (!origin_city || !origin_state || !dest_city || !dest_state || !posted_rate || !miles || !broker_name || !pickup_date) {
        errors.push({ row: i + 2, error: 'Missing required fields (origin_city, origin_state, dest_city, dest_state, posted_rate, miles, broker_name, pickup_date)' })
        continue
      }

      // Normalize date
      let normalizedDate = pickup_date
      // Handle Excel numeric dates
      const numericDate = Number(pickup_date)
      if (!isNaN(numericDate) && numericDate > 40000) {
        const excelEpoch = new Date(1900, 0, 1)
        excelEpoch.setDate(excelEpoch.getDate() + numericDate - 2)
        normalizedDate = excelEpoch.toISOString().split('T')[0]
      } else if (pickup_date.includes('/')) {
        const parts = pickup_date.split('/')
        if (parts.length === 3) {
          normalizedDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
        }
      }

      const originCoords = getCoords(origin_city, origin_state)
      const destCoords = getCoords(dest_city, dest_state)
      const rate_per_mile = Number((Number(posted_rate) / Number(miles)).toFixed(2))

      try {
        const { data, error } = await admin.database
          .from('loads')
          .insert([{
            origin_city,
            origin_state: origin_state.toUpperCase(),
            origin_lat: originCoords.lat,
            origin_lng: originCoords.lng,
            dest_city,
            dest_state: dest_state.toUpperCase(),
            dest_lat: destCoords.lat,
            dest_lng: destCoords.lng,
            posted_rate: Number(posted_rate),
            rate_per_mile,
            broker_name,
            broker_phone,
            equipment_type,
            weight: Number(weight),
            miles: Number(miles),
            pickup_date: normalizedDate,
            status: 'available',
            source,
          }])
          .select()
          .single()

        if (error) {
          errors.push({ row: i + 2, error: error.message })
        } else {
          inserted.push(data)
        }
      } catch (e) {
        errors.push({ row: i + 2, error: e instanceof Error ? e.message : 'Insert failed' })
      }
    }

    return NextResponse.json({
      success: true,
      inserted: inserted.length,
      errors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
