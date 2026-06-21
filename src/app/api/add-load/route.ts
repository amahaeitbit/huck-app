import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/insforge'
import { getCoords } from '@/lib/geo'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const admin = createServiceClient()

    const {
      origin_city,
      origin_state,
      dest_city,
      dest_state,
      posted_rate,
      miles,
      equipment_type = 'Dry Van',
      weight = 40000,
      broker_name,
      broker_phone,
      pickup_date,
      source = 'Manual',
    } = body

    // Validate required fields
    if (!origin_city || !origin_state || !dest_city || !dest_state || !posted_rate || !miles || !broker_name || !pickup_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const originCoords = getCoords(origin_city, origin_state)
    const destCoords = getCoords(dest_city, dest_state)
    const rate_per_mile = Number((Number(posted_rate) / Number(miles)).toFixed(2))

    const { data, error } = await admin.database
      .from('loads')
      .insert([{
        origin_city: origin_city.trim(),
        origin_state: origin_state.trim().toUpperCase(),
        origin_lat: originCoords.lat,
        origin_lng: originCoords.lng,
        dest_city: dest_city.trim(),
        dest_state: dest_state.trim().toUpperCase(),
        dest_lat: destCoords.lat,
        dest_lng: destCoords.lng,
        posted_rate: Number(posted_rate),
        rate_per_mile,
        broker_name: broker_name.trim(),
        broker_phone: (broker_phone || '').trim(),
        equipment_type,
        weight: Number(weight),
        miles: Number(miles),
        pickup_date,
        status: 'available',
        source,
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, load: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add load'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
