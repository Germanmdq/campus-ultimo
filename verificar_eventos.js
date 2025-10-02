// Script para verificar tablas de eventos en Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://epqalebkqmkddlfomnyf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcWFsZWJrcW1rZGRsZm9tbnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzQ4NzMsImV4cCI6MjA1MTI1MDg3M30.8QZqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verificarTablas() {
  console.log('🔍 Verificando tablas de eventos...')
  
  try {
    // 1. Verificar tabla events
    console.log('\n1. Verificando tabla events...')
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(1)
    
    if (eventsError) {
      console.log('❌ Error en tabla events:', eventsError.message)
    } else {
      console.log('✅ Tabla events existe')
    }
    
    // 2. Verificar tabla event_notifications
    console.log('\n2. Verificando tabla event_notifications...')
    const { data: notifications, error: notificationsError } = await supabase
      .from('event_notifications')
      .select('*')
      .limit(1)
    
    if (notificationsError) {
      console.log('❌ Error en tabla event_notifications:', notificationsError.message)
    } else {
      console.log('✅ Tabla event_notifications existe')
    }
    
    // 3. Verificar datos existentes
    console.log('\n3. Verificando datos existentes...')
    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 Eventos en la base de datos: ${eventsCount || 0}`)
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

verificarTablas()
