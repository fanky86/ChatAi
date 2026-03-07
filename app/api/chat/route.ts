import { openai } from '@/lib/ai'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json()

    // Verifikasi user
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Verifikasi chatId (opsional)
    if (chatId) {
      const { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .single()
      if (!chat) {
        return new Response('Forbidden', { status: 403 })
      }
    }

    // Panggil OpenAI dengan streaming
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      stream: true,
    })

    // Buat stream sendiri (Server-Sent Events)
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            const jsonString = JSON.stringify({ content })
            controller.enqueue(encoder.encode(`data: ${jsonString}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
