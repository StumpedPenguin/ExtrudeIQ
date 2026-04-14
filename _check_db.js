const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
});
const { createClient } = require('@supabase/supabase-js');

async function check() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // Check if accounts table exists
  const { data: accts, error: acctErr } = await supa.from('accounts').select('id').limit(1);
  console.log('accounts table:', acctErr ? 'ERROR: ' + acctErr.message : 'exists, rows: ' + (accts||[]).length);

  // Check quotes columns
  const { data: quotes, error: qErr } = await supa.from('quotes').select('*').limit(1);
  if (qErr) {
    console.log('quotes table ERROR:', qErr.message);
  } else {
    console.log('quotes columns:', quotes && quotes.length > 0 ? Object.keys(quotes[0]).join(', ') : 'table empty, checking with insert...');
  }

  // Try the exact join query used by the app
  const { data: joinTest, error: joinErr } = await supa
    .from('quotes')
    .select('id, quote_number, account_id, account:accounts ( id, name )')
    .limit(1);
  console.log('join test:', joinErr ? 'ERROR: ' + joinErr.message : 'OK, rows: ' + (joinTest||[]).length);

  // Check if account_id column exists via a direct select
  const { data: colTest, error: colErr } = await supa
    .from('quotes')
    .select('account_id')
    .limit(1);
  console.log('account_id column:', colErr ? 'ERROR: ' + colErr.message : 'exists');

  // Check FK constraints on quotes table
  const { data: fks, error: fkErr } = await supa.rpc('exec_sql', {});
  // Can't run raw SQL via rpc, so let's check by trying to add the FK
  console.log('\\nTry adding FK constraint manually...');
  
  // Check opportunities join too
  const { data: oppTest, error: oppErr } = await supa
    .from('quotes')
    .select('id, opportunity_id, opportunity:opportunities ( id, name )')
    .limit(1);
  console.log('opportunities join:', oppErr ? 'ERROR: ' + oppErr.message : 'OK');
}

check().catch(e => console.error('Fatal:', e.message));
