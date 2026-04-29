import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer/mod.ts'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Switch providers by setting EMAIL_PROVIDER=resend (default: smtp)
const EMAIL_PROVIDER = Deno.env.get('EMAIL_PROVIDER') ?? 'smtp'

// SMTP (Gmail) — active now
const GMAIL_USER         = Deno.env.get('GMAIL_USER') ?? ''
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') ?? ''

// Resend — set these when you have a verified domain
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_ADDRESS   = Deno.env.get('FROM_EMAIL') ?? `Protetoras Três Lagoas <${GMAIL_USER}>`

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Status       = 'contactado' | 'aprovado' | 'recusado'
type InterestType = 'adocao' | 'lar_temporario' | 'voluntario' | 'contribuicao'

function getTemplate(status: Status, type: InterestType): { subject: string; paragraphs: string[] } | null {
  // ── RECUSADO (shared across all types) ───────────────────────────────────
  if (status === 'recusado') {
    const label = { adocao: 'adoção', lar_temporario: 'lar temporário', voluntario: 'voluntariado', contribuicao: 'interesse' }[type]
    return {
      subject: `Sobre sua solicitação de ${label}`,
      paragraphs: [
        'Olá, tudo bem?',
        `Agradecemos muito pelo seu interesse e por dedicar seu tempo ao preenchimento da ficha de ${label}.`,
        'Após uma análise cuidadosa, entendemos que, neste momento, você não foi selecionado(a) para esta solicitação específica. Cada processo é realizado com bastante responsabilidade, buscando sempre o melhor perfil para as necessidades de cada situação.',
        'Agradecemos pela compreensão e esperamos poder contar com você em futuras oportunidades.',
        'Seguimos à disposição,<br><strong>Associação Protetoras Três Lagoas</strong>',
      ],
    }
  }

  // ── ADOÇÃO ───────────────────────────────────────────────────────────────
  if (type === 'adocao') {
    if (status === 'contactado') return {
      subject: 'Continuidade da sua solicitação de adoção 🐾',
      paragraphs: [
        'Olá, tudo bem?',
        'Agradecemos muito pelo seu interesse e pelo preenchimento da ficha de adoção 💛',
        'Sua solicitação seguiu para a próxima etapa do processo. Em breve, uma de nossas voluntárias entrará em contato com você via WhatsApp para conversar melhor, tirar eventuais dúvidas e dar continuidade à avaliação.',
        'Durante esse contato, poderá ser solicitado o envio de fotos do ambiente onde o animal irá morar. Esse pedido é feito com muito cuidado e responsabilidade, sendo restrito apenas à equipe de avaliação, com o único objetivo de garantir o bem-estar e a segurança do animal.',
        'Agradecemos pela confiança e seguimos à disposição,<br><strong>Associação Protetoras Três Lagoas</strong>',
      ],
    }
    if (status === 'aprovado') return {
      subject: 'Você foi aprovado(a) para adoção 🐾💛',
      paragraphs: [
        'Olá, tudo bem?',
        'Ficamos muito felizes em te contar que você foi aprovado(a) no processo de adoção pela Associação Protetoras Três Lagoas! 💛',
        'Em breve, uma de nossas voluntárias entrará em contato com você via WhatsApp para orientar sobre tudo o que será necessário providenciar antes da chegada do animal ao seu novo lar.',
        'A entrega será realizada por nossa equipe, diretamente na sua residência. Nesse momento, será feita a assinatura do termo de responsabilidade e adoção.',
        'Após a adoção, a Associação Protetoras Três Lagoas continuará acompanhando de perto essa nova fase, oferecendo suporte, orientação e pedindo fotos do animal, sempre que necessário. Com o tempo, esse acompanhamento será gradualmente reduzido, sempre com o objetivo de garantir a segurança e o bem-estar do animal.',
        'Agradecemos pela confiança e por abrir seu lar para uma nova vida 🐾',
        'Seguimos à disposição,<br><strong>Associação Protetoras Três Lagoas</strong>',
      ],
    }
  }

  // ── LAR TEMPORÁRIO ───────────────────────────────────────────────────────
  if (type === 'lar_temporario') {
    if (status === 'contactado') return {
      subject: 'Continuidade da sua solicitação de lar temporário 🐾',
      paragraphs: [
        'Olá, tudo bem?',
        'Agradecemos muito pelo seu interesse em ser um lar temporário e pelo preenchimento da ficha 💛',
        'Sua solicitação seguiu para a próxima etapa do processo. Em breve, uma de nossas voluntárias entrará em contato com você via WhatsApp para conversar melhor, tirar eventuais dúvidas e dar continuidade à avaliação.',
        'Agradecemos pela confiança e seguimos à disposição,<br><strong>Associação Protetoras Três Lagoas</strong>',
      ],
    }
    if (status === 'aprovado') return {
      subject: 'Você foi aprovado(a) como lar temporário 🐾💛',
      paragraphs: [
        'Olá, tudo bem?',
        'Ficamos muito felizes em te contar que você foi aprovado(a) como lar temporário pela Associação Protetoras Três Lagoas! 💛',
        'Em breve, uma de nossas voluntárias entrará em contato com você via WhatsApp para orientar sobre os próximos passos e combinar a melhor forma de receber o animal.',
        'Como lar temporário, você estará contribuindo de forma fundamental para o bem-estar e recuperação do animal até que ele encontre um lar definitivo. Nossa equipe estará sempre à disposição para oferecer suporte e orientação.',
        'Agradecemos imensamente pela sua disponibilidade e carinho 🐾',
        'Seguimos à disposição,<br><strong>Associação Protetoras Três Lagoas</strong>',
      ],
    }
  }

  // ── VOLUNTÁRIO ───────────────────────────────────────────────────────────
  if (type === 'voluntario') {
    if (status === 'contactado') return {
      subject: 'Continuidade da sua solicitação de voluntariado 🐾',
      paragraphs: [
        'Olá, tudo bem?',
        'Agradecemos muito pelo seu interesse em fazer parte da nossa equipe e pelo preenchimento da ficha 💛',
        'Sua solicitação seguiu para a próxima etapa. Em breve, uma de nossas voluntárias entrará em contato com você via WhatsApp para conversar melhor e dar continuidade ao processo.',
        'Agradecemos pela confiança e seguimos à disposição,<br><strong>Associação Protetoras Três Lagoas</strong>',
      ],
    }
    if (status === 'aprovado') return {
      subject: 'Bem-vinda à equipe Protetoras Três Lagoas! 🐾💛',
      paragraphs: [
        'Olá, tudo bem?',
        'Estamos muito felizes em te dar as boas-vindas à equipe de voluntárias da Associação Protetoras Três Lagoas! 💛',
        'Em breve, uma de nossas voluntárias entrará em contato com você via WhatsApp para orientar sobre os próximos passos e sua integração na equipe.',
        'Seu apoio faz toda a diferença na vida dos animais que resgatamos e cuidamos. Obrigada por fazer parte desta causa! 🐾',
        'Seguimos à disposição,<br><strong>Associação Protetoras Três Lagoas</strong>',
      ],
    }
  }

  // ── CONTRIBUIÇÃO / FALLBACK ───────────────────────────────────────────────
  if (status === 'contactado') return {
    subject: 'Recebemos sua mensagem — Protetoras Três Lagoas 🐾',
    paragraphs: [
      'Olá, tudo bem?',
      'Agradecemos muito pelo seu contato com a Associação Protetoras Três Lagoas 💛',
      'Em breve, uma de nossas voluntárias entrará em contato com você via WhatsApp.',
      'Seguimos à disposição,<br><strong>Associação Protetoras Três Lagoas</strong>',
    ],
  }

  return null
}

function buildHtml(paragraphs: string[]): string {
  const body = paragraphs
    .map(p => `<p style="margin:0 0 16px;color:#374151;line-height:1.7;font-size:15px;">${p}</p>`)
    .join('')
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation"
      style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
      <tr>
        <td style="background:#059669;padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:bold;">🐾 Protetoras Três Lagoas</p>
          <p style="margin:4px 0 0;color:#a7f3d0;font-size:13px;">Associação de Proteção Animal</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 24px;">${body}</td>
      </tr>
      <tr>
        <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
            Associação Protetoras Três Lagoas · CNPJ 29.022.433/0001-20<br>
            <a href="mailto:protetorastl@gmail.com" style="color:#6b7280;text-decoration:none;">protetorastl@gmail.com</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (EMAIL_PROVIDER === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
    })
    if (!res.ok) throw new Error(await res.text())
    return
  }

  // SMTP (Gmail)
  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
    },
  })
  try {
    await client.send({
      from: `Protetoras Três Lagoas <${GMAIL_USER}>`,
      to,
      subject,
      html,
    })
  } finally {
    await client.close()
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { interestId, status } = await req.json() as { interestId: string; status: Status }

    if (!interestId || !status) {
      return new Response(JSON.stringify({ error: 'interestId and status are required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE)

    const { data: interest, error: fetchErr } = await db
      .from('interests')
      .select('id, full_name, email, interest_type')
      .eq('id', interestId)
      .single()

    if (fetchErr || !interest) {
      return new Response(JSON.stringify({ error: 'Interest not found' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (!interest.email) {
      return new Response(JSON.stringify({ error: 'No email on record' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const template = getTemplate(status, interest.interest_type as InterestType)
    if (!template) {
      return new Response(JSON.stringify({ error: 'No template for this status/type' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    await sendEmail(interest.email, template.subject, buildHtml(template.paragraphs))

    await db
      .from('interests')
      .update({ email_sent_at: new Date().toISOString(), email_sent_status: status })
      .eq('id', interestId)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
