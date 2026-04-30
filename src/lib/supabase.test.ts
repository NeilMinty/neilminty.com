import { describe, it } from 'vitest'
import { supabase } from './supabase'

describe('Supabase connection', () => {
  it('inserts and deletes a test row in tool_sessions', async () => {
    const { data: inserted, error: insertError } = await supabase
      .from('tool_sessions')
      .insert({ tool_name: 'connection_test', status: 'started' })
      .select('id')
      .single()

    if (insertError) {
      console.error('INSERT failed:', insertError.message)
      throw insertError
    }

    console.log('INSERT ok — id:', inserted.id)

    const { error: deleteError } = await supabase
      .from('tool_sessions')
      .delete()
      .eq('id', inserted.id)

    if (deleteError) {
      console.error('DELETE failed:', deleteError.message)
      throw deleteError
    }

    console.log('DELETE ok — no test data left')
  })
})
