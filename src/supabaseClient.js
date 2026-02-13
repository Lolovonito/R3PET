
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngcubmaaylrgidxmejak.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nY3VibWFheWxyZ2lkeG1lamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTkzMTcsImV4cCI6MjA4NDg5NTMxN30.lWKfyrLs4yopQRouRrs8yhU9pZkb9aELC1-ivNQ6jJ0';

export const supabase = createClient(supabaseUrl, supabaseKey);
