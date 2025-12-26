import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eyegbhijkwdlnjmhgqhy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZWdiaGlqa3dkbG5qbWhncWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NzA0MTcsImV4cCI6MjA4MjM0NjQxN30.mOFFHxaFijix0D0qKvRrW9QNTOT9_3n8ssTF4_EjnD8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('--- MIGRATION: ADD USERNAME TO PROFILES ---');

  // Infelizmente, não podemos rodar ALTER TABLE diretamente via client anonimo.
  // Mas vamos tentar verificar se a coluna existe ou simular a necessidade de rodar no painel.
  
  console.log('ATENÇÃO: Este script é apenas informativo.');
  console.log('Para adicionar a coluna "username" na tabela "profiles", você precisa rodar o seguinte SQL no painel do Supabase:');
  console.log('\n---------------------------------------------------');
  console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(255);');
  console.log('CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);');
  console.log('---------------------------------------------------\n');
  
  // Vamos tentar listar os perfis para ver se quebra (se quebrar, pode ser RLS ou coluna faltando)
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  
  if (error) {
    console.error('Erro de conexão/leitura:', error.message);
  } else {
    console.log('Conexão OK. Dados atuais:', data);
  }
}

migrate();
