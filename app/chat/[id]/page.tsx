import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ChatInterface from '@/components/ChatInterface'
import ChatSidebar from '@/components/ChatSidebar'

export default async function ChatDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Ambil chat tertentu
  const { data: chat } = await supabase
    .from('chats')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!chat) redirect('/chat')

  // Ambil pesan-pesan chat
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', params.id)
    .order('created_at', { ascending: true })

  // Ambil daftar chat user
  const { data: chats } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex h-screen bg-gray-900">
      <ChatSidebar chats={chats || []} activeId={params.id} />
      <div className="flex-1 flex flex-col">
        <ChatInterface
          userId={user.id}
          chatId={params.id}
          initialMessages={messages || []}
          chatTitle={chat.title}
        />
      </div>
    </div>
  )
}
