const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  console.log("Fetching logs...");
  const { data, error } = await supabase
    .from('payment_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error("ERRO:", error);
    return;
  }
  console.log("ÚLTIMOS 5 LOGS:");
  data.forEach((log, i) => {
    console.log(`[${i}] ID = ${log.id} | USER = ${log.user_id} | AMOUNT = Rs ${log.amount_reais} (${log.moral_amount} Moral) | STATUS = ${log.status} | EXT = ${log.external_id}`);
  });
}

check();
