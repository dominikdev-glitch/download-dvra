import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  MessageCircle,
  Send,
  User,
  Mail,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  Inbox
} from 'lucide-react';
import { ChatConversation, ChatMessage } from '../../types';
import { authFetch } from '../../lib/api';

interface AdminChatInboxProps {
  adminEmail?: string;
}

export const AdminChatInbox: React.FC<AdminChatInboxProps> = ({
  adminEmail = 'celiwamama@gmail.com',
}) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all conversations
  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/chat/admin/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setTotalUnread(data.totalUnread || 0);

        // Auto select first if none selected
        if (!selectedSessionId && data.conversations && data.conversations.length > 0) {
          setSelectedSessionId(data.conversations[0].sessionId);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch messages for selected conversation
  const fetchSelectedMessages = async (sessionId: string) => {
    if (!sessionId) return;
    try {
      const res = await authFetch(`/api/chat/admin/messages?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        // Update unread badge locally
        setConversations((prev) =>
          prev.map((c) => (c.sessionId === sessionId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSelectedMessages(selectedSessionId);
      const interval = setInterval(() => {
        fetchSelectedMessages(selectedSessionId);
      }, 4000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !selectedSessionId || isSending) return;

    const text = replyText.trim();
    setReplyText('');
    setIsSending(true);

    try {
      const res = await authFetch('/api/chat/admin/reply', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: selectedSessionId,
          content: text,
          adminEmail,
        }),
      });

      if (res.ok) {
        await fetchSelectedMessages(selectedSessionId);
        await fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearConversation = async (sessionId: string) => {
    if (!confirm('Are you sure you want to clear this visitor chat conversation?')) return;
    try {
      const res = await authFetch('/api/chat/admin/clear', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        fetchConversations();
        if (selectedSessionId === sessionId) {
          setSelectedSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to clear conversation:', err);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.visitorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConv = conversations.find((c) => c.sessionId === selectedSessionId);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[640px]">
      {/* Top Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Live Support & Chat Admin Inbox
              </h2>
              {totalUnread > 0 && (
                <span className="bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {totalUnread} Unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono flex items-center space-x-1 mt-0.5">
              <span>Admin Account:</span>
              <strong className="text-emerald-400">{adminEmail}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={`mailto:${adminEmail}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
          >
            <Mail className="w-3.5 h-3.5 text-blue-400" />
            <span>Open Email Inbox</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
          <button
            onClick={() => fetchConversations()}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Refresh conversations"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Two-Pane Chat View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Conversation List */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-950/60 border-r border-slate-800 flex flex-col shrink-0">
          {/* Search Box */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search visitor or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <Inbox className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs">No active visitor chats yet.</p>
                <p className="text-[10px] text-slate-600">
                  New visitor messages from the website will appear here in real-time.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.sessionId === selectedSessionId;
                return (
                  <div
                    key={conv.sessionId}
                    onClick={() => setSelectedSessionId(conv.sessionId)}
                    className={`p-3 transition-colors cursor-pointer flex items-start justify-between ${
                      isSelected
                        ? 'bg-blue-600/15 border-l-4 border-blue-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                        {conv.visitorName.charAt(0).toUpperCase() || 'V'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-slate-200 truncate">
                            {conv.visitorName || 'Visitor'}
                          </h4>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {conv.visitorEmail && (
                          <p className="text-[10px] text-slate-400 truncate">{conv.visitorEmail}</p>
                        )}
                        <p className="text-[11px] text-slate-300 truncate mt-0.5 font-normal">
                          {conv.lastMessage}
                        </p>
                      </div>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Conversation */}
        <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
          {selectedSessionId && selectedConv ? (
            <>
              {/* Selected Conversation Bar */}
              <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                    {selectedConv.visitorName.charAt(0).toUpperCase() || 'V'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xs font-bold text-white">
                        {selectedConv.visitorName || 'Visitor'}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Session: {selectedConv.sessionId.substring(0, 14)}...
                      </span>
                    </div>
                    {selectedConv.visitorEmail ? (
                      <a
                        href={`mailto:${selectedConv.visitorEmail}`}
                        className="text-[11px] text-blue-400 hover:underline flex items-center space-x-1"
                      >
                        <Mail className="w-3 h-3" />
                        <span>{selectedConv.visitorEmail}</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-500">No email provided</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedConv.visitorEmail && (
                    <a
                      href={`mailto:${selectedConv.visitorEmail}?subject=Support%20Reply%20from%20DVRA%20Suite`}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 border border-slate-700"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span>Email Visitor</span>
                    </a>
                  )}
                  <button
                    onClick={() => handleClearConversation(selectedConv.sessionId)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Clear conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/30">
                {messages.map((msg) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1 px-1">
                        <span className="text-[10px] font-semibold text-slate-400">
                          {isAdmin ? `You (Admin: ${adminEmail})` : (msg.senderName || 'Visitor')}
                        </span>
                        <span className="text-[9px] text-slate-600 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words shadow-xs ${
                          isAdmin
                            ? 'bg-blue-600 text-white rounded-tr-xs'
                            : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Admin Reply Box */}
              <form
                onSubmit={handleSendReply}
                className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder={`Reply as Admin (${adminEmail})...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Reply</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 p-8">
              <MessageCircle className="w-12 h-12 text-slate-700" />
              <div className="text-center">
                <h3 className="text-sm font-semibold text-slate-300">Select a Conversation</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Choose a visitor chat from the left pane to view message history and send direct replies as Admin (<span className="text-slate-400 font-mono">{adminEmail}</span>).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
