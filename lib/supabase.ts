
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uutlblyopvreorxibper.supabase.co';
const supabaseKey = 'sb_publishable_S_uY5R-PDzLGIBymN4bO_Q_MyY74l8H';

export const supabase = createClient(supabaseUrl, supabaseKey);
