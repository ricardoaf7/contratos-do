import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cria cliente Supabase com permissão de Admin (Service Role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Recebe dados do frontend
    const { email, password, nome, username, role, manager_id, gerencia_id, setor_id } = await req.json()

    // Validação básica
    if (!email || !password || !nome || !username || !role) {
      throw new Error('Dados incompletos: nome, email, username, senha e cargo são obrigatórios.')
    }

    // 1. Criar usuário no Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma e-mail automaticamente
      user_metadata: {
        nome,
        username,
        role,
        gerencia_id,
        setor_id
      }
    })

    if (userError) throw userError
    if (!userData.user) throw new Error('Erro ao criar usuário no Auth')

    // 2. Inserir dados na tabela pública 'profiles'
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userData.user.id,
        user_id: userData.user.id,
        nome,
        email,
        username,
        role,
        manager_id: manager_id || null, // Mantido para compatibilidade
        gerencia_id: gerencia_id || null,
        setor_id: setor_id || null,
        created_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Erro ao criar profile:', profileError)
      // Tentar deletar o usuário do Auth para manter consistência (rollback manual)
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw new Error(`Erro ao salvar perfil: ${profileError.message}`)
    }

    return new Response(
      JSON.stringify({ user: userData.user, message: 'Usuário criado com sucesso' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
