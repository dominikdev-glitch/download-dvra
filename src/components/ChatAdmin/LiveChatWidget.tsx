import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  MessageCircle,
  Send,
  X,
  Mail,
  User,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { ChatMessage } from '../../types';

interface LiveChatWidgetProps {
  adminEmail?: string;
}

export const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({
  adminEmail = 'celiwamama@gmail.com',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [visitorName, setVisitorName] = useState<string>('');
  const [visitorEmail, setVisitorEmail] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasPromptedInfo, setHasPromptedInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or retrieve visitor session
  useEffect(() => {
    let sId = localStorage.getItem('dvra_chat_session_id');
    if (!sId) {
      sId = `visitor_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      localStorage.setItem('dvra_chat_session_id', sId);
    }
    setSessionId(sId);

    const savedName = localStorage.getItem('dvra_chat_visitor_name') || '';
    const savedEmail = localStorage.getItem('dvra_chat_visitor_email') || '';
    setVisitorName(savedName);
    setVisitorEmail(savedEmail);
    if (savedName || savedEmail) {
      setHasPromptedInfo(true);
    }
  }, []);

  // Fetch messages
  const fetchMessages = async (sId: string) => {
    if (!sId) return;
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${encodeURIComponent(sId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
          if (!isOpen && data.messages.length > 1) {
            const adminMsgs = data.messages.filter((m: ChatMessage) => m.sender === 'admin' && m.id !== 'welcome-seed');
            setUnreadCount(adminMsgs.length);
          }
        }
      }
    } catch {
      // ignore network blips
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchMessages(sessionId);
      const interval = setInterval(() => {
        fetchMessages(sessionId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const content = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    // Save info
    if (visitorName) localStorage.setItem('dvra_chat_visitor_name', visitorName);
    if (visitorEmail) localStorage.setItem('dvra_chat_visitor_email', visitorEmail);
    setHasPromptedInfo(true);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          visitorName: visitorName.trim() || 'Visitor',
          visitorEmail: visitorEmail.trim(),
          content,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const quickPrompts = [
    'How do I download the Windows Setup?',
    'Need help with token generation & keys',
    'Question regarding database connection',
  ];

  return (
    <aside aria-label="Support Chat Widget" className="fixed bottom-6 right-6 sm:bottom-7 sm:right-7 z-40">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          id="btn-floating-chat-admin"
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-3 rounded-full shadow-xl shadow-blue-500/25 transition-all duration-200 group cursor-pointer border border-blue-400/30 ring-4 ring-black/5 hover:ring-blue-500/20"
          title={`Chat with Admin (${adminEmail})`}
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-blue-600 animate-pulse" />
          </div>
          <span className="text-xs font-bold tracking-wide">Live Support</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Modal / Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 border-b border-white/10 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="relative w-8 h-8 rounded-full bg-white/15 flex items-center justify-center border border-white/20">
                <MessageSquare className="w-4 h-4 text-emerald-300" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-bold leading-tight">Live Support</h3>
                  <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[9px] px-1.5 py-0.2 rounded font-medium">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/80 font-mono truncate max-w-[190px]">
                  {adminEmail}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <a
                href={`mailto:${adminEmail}?subject=${encodeURIComponent(
                  'Request: DVRA Software License Activation'
                )}&body=${encodeURIComponent(
                  'Hello DVRA Team,\n\nI would like to request an activation license for the DVRA Software Suite:\n\n• Name / Organization: \n• Hardware / Device Identifier: \n• Number of Licenses Needed: \n• Additional Notes: \n\nPlease provide the activation key and instructions to activate the software.\n\nThank you,\n'
                )}`}
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title={`Send direct email to ${adminEmail}`}
              >
                <Mail className="w-4 h-4" />
              </a>
              <button
                onClick={() => fetchMessages(sessionId)}
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Refresh messages"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Contact Bar */}
          <div className="bg-slate-950/70 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center space-x-1 truncate mr-2">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Direct Admin Channel: <strong className="text-slate-200 font-mono">{adminEmail}</strong></span>
            </span>
            <a
              href={`mailto:${adminEmail}?subject=${encodeURIComponent(
                'Request: DVRA Software License Activation'
              )}&body=${encodeURIComponent(
                'Hello DVRA Team,\n\nI would like to request an activation license for the DVRA Software Suite:\n\n• Name / Organization: \n• Hardware / Device Identifier: \n• Number of Licenses Needed: \n• Additional Notes: \n\nPlease provide the activation key and instructions to activate the software.\n\nThank you,\n'
              )}`}
              className="text-blue-400 hover:underline flex items-center space-x-0.5 font-medium shrink-0 cursor-pointer"
            >
              <span>Email</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Visitor Info Banner (if not saved) */}
          {!hasPromptedInfo && (
            <div className="bg-slate-800/80 border-b border-slate-700/60 p-2.5 text-[11px] space-y-1.5">
              <span className="text-slate-300 font-semibold flex items-center space-x-1">
                <User className="w-3 h-3 text-blue-400" />
                <span>Your Name & Email (Optional for reply):</span>
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-blue-500"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-slate-950/40 text-xs">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 py-8">
                <MessageSquare className="w-8 h-8 text-slate-600 animate-bounce" />
                <p className="text-xs">Start a conversation with Admin</p>
                <p className="text-[10px] text-slate-500 font-mono">{adminEmail}</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center space-x-1 mb-0.5 px-1">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {isAdmin ? 'Admin (Support)' : (msg.senderName || 'You')}
                      </span>
                      <span className="text-[9px] text-slate-600">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed break-words shadow-xs ${
                        isAdmin
                          ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-xs'
                          : 'bg-blue-600 text-white rounded-tr-xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="px-2.5 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputMessage(prompt);
                  }}
                  className="shrink-0 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 px-2 py-1 rounded-full transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center space-x-2 shrink-0"
          >
            <input
              type="text"
              id="input-visitor-chat-message"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message for Admin..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
};
