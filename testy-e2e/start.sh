#!/bin/bash
su pgt -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgt/data -o '-p 5499 -k /tmp/pgt' -l /tmp/pgt/log start" >/dev/null 2>&1
sleep 2
cd /tmp/claude-0/e2e
./bin/postgrest pgrst.conf > pgrst.log 2>&1 &
node gw.js > gw.log 2>&1 &
sleep 1
K=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIxMDAwMDAwMDB9.jcnpIja7qdUighmsC7bYwI2_fwmPiasv5cf7mtVTVuM
cd /home/claude/rozoberacka/web && NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=$K npx next dev -p 3000 > /tmp/claude-0/e2e/next.log 2>&1 &
wait
