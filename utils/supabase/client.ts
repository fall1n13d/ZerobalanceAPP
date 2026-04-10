import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    'https://bsnsaamwmnmzkmlzbhln.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbnNhYW13bW5temttbHpiaGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzYxNjIsImV4cCI6MjA5MTM1MjE2Mn0.MtrBHRhONuzpc6IhLio8rNXSWfmqmw081eWexzVjpiA'
  )
}