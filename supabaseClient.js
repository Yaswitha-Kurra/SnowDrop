import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  "https://vavrqhflogjkxnsphdhh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnJxaGZsb2dqa3huc3BoZGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTg0OTYsImV4cCI6MjA2ODgzNDQ5Nn0.g9-9Pe_KXWCWqENEvgtmtFBVm64dRKM9slQrhdYU_lQ"
);