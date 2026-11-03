import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  Bot,
  User,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
  Brain,
  WifiOff,
  Volume2,
  VolumeX,
  Paperclip,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { ChatMessage, Conversation, ToolCallProposal } from '../../types/chat';
import {
  getAllConversations,
  getConversation,
  saveConversation,
  deleteConversation,
} from '../../db/conversations';
import { getMessagesByConversation, saveMessage } from '../../db/messages';
import { GeminiClient } from '../../core/ai/geminiClient';
import { ApprovalEngine } from '../../core/approval/approvalEngine';
import { MemoryService } from '../../core/memory/memoryService';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { RiskBadge } from '../common/RiskBadge';

interface ChatViewProps {
  initialConversationId?: string;
  onNavigateToApprovals: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  initialConversationId,
  onNavigateToApprovals,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextMemoriesCount, setContextMemoriesCount] = useState(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [attachedFileInfo, setAttachedFileInfo] = useState<{ name: string; preview?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOnline = useOnlineStatus();
  const {
    isListening,
    transcript,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const { isSpeaking, isSupported: isTtsSupported, speak, stop: stopSpeaking } = useTextToSpeech();

  useEffect(() => {
    loadConversations();
    loadMemoryContextCount();
  }, []);

  useEffect(() => {
    if (initialConversationId) {
      selectConversation(initialConversationId);
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const loadMemoryContextCount = async () => {
    try {
      const ctx = await MemoryService.getContextForAI();
      setContextMemoriesCount(ctx.length);
    } catch {
      // ignore
    }
  };

  const loadConversations = async () => {
    try {
      const list = await getAllConversations();
      setConversations(list);
      if (!currentConvId && list.length > 0) {
        selectConversation(list[0].id);
      } else if (list.length === 0) {
        startNewConversation();
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const selectConversation = async (id: string) => {
    setCurrentConvId(id);
    try {
      const msgs = await getMessagesByConversation(id);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const startNewConversation = async () => {
    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newConv: Conversation = {
      id,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preview: 'Start a conversation with your agent...',
    };
    await saveConversation(newConv);
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConvId(id);
    setMessages([]);
    setInputText('');
    setAttachedFileInfo(null);
  };

  const handleDeleteConversation = async (id: string) => {
    if (window.confirm('Delete this conversation and its local message history?')) {
      stopSpeaking();
      await deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (currentConvId === id) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          startNewConversation();
        }
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedFileInfo({
          name: file.name,
          preview: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedFileInfo({
        name: file.name,
      });
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let text = inputText.trim();
    if (!text && !attachedFileInfo) return;
    if (isLoading) return;

    if (!isOnline) {
      setErrorBanner('Cannot contact Gemini AI while offline. Local data is preserved.');
      return;
    }

    if (attachedFileInfo) {
      text = text
        ? `[Attached phone file: ${attachedFileInfo.name}]\n${text}`
        : `[Shared phone file: ${attachedFileInfo.name}]. Please analyze this file.`;
    }

    setErrorBanner(null);

    let activeConvId = currentConvId;
    if (!activeConvId) {
      activeConvId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newConv: Conversation = {
        id: activeConvId,
        title: text.slice(0, 32),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        preview: text.slice(0, 50),
      };
      await saveConversation(newConv);
      setConversations((prev) => [newConv, ...prev]);
      setCurrentConvId(activeConvId);
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: activeConvId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, userMsg]);
    await saveMessage(userMsg);
    setInputText('');
    setAttachedFileInfo(null);
    resetTranscript();
    setIsLoading(true);

    try {
      // Gather relevant memory context
      const contextMemories = await MemoryService.getContextForAI();

      // Recent history
      const history = messages.slice(-6).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response = await GeminiClient.sendMessage({
        message: text,
        conversationId: activeConvId,
        history,
        contextMemories,
      });

      // Process any tool proposals generated by Gemini through the Approval Engine
      const toolProposals: ToolCallProposal[] = [];

      if (response.toolProposals && response.toolProposals.length > 0) {
        for (const prop of response.toolProposals) {
          const proposalResult = await ApprovalEngine.proposeAction({
            toolId: prop.toolId,
            actionName: prop.actionName,
            description: prop.description,
            target: prop.target,
            dataAffected: prop.dataAffected,
            params: prop.params,
            conversationId: activeConvId,
          });

          toolProposals.push({
            ...prop,
            approvalId: proposalResult.request?.id,
          });
        }
      }

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        conversationId: activeConvId,
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        toolProposals: toolProposals.length > 0 ? toolProposals : undefined,
        status: 'sent',
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await saveMessage(assistantMsg);

      // Auto-speak voice if enabled
      if (autoSpeak && isTtsSupported) {
        speak(response.text);
      }

      // Update conversation title and preview
      const conv = await getConversation(activeConvId);
      if (conv) {
        if (conv.title === 'New Conversation') {
          conv.title = text.slice(0, 32);
        }
        conv.preview = response.text.slice(0, 60);
        conv.updatedAt = Date.now();
        await saveConversation(conv);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...conv } : c))
        );
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        conversationId: activeConvId,
        role: 'assistant',
        content: `Error: ${err?.message || 'Failed to receive AI response. Please check server status.'}`,
        timestamp: Date.now(),
        status: 'error',
      };
      setMessages((prev) => [...prev, errorMsg]);
      await saveMessage(errorMsg);
      setErrorBanner(err?.message || 'Failed to receive AI response.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-135px)] sm:h-[calc(100vh-120px)] bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      {/* Chat Header Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-slate-900/90 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Sparkles className="w-4 h-4" />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                isOnline ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm font-semibold text-white truncate">MY AGENT</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                Gemini 3.8
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
              {contextMemoriesCount > 0 && (
                <span className="flex items-center gap-1 text-purple-400 shrink-0">
                  <Brain className="w-3 h-3" />
                  {contextMemoriesCount} memories
                </span>
              )}
              <span>• Local-First</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Voice Auto-Speak Toggle */}
          {isTtsSupported && (
            <button
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking();
                }
                setAutoSpeak(!autoSpeak);
              }}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                autoSpeak
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={autoSpeak ? 'Voice response enabled (Click to mute)' : 'Enable voice responses'}
            >
              {autoSpeak ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Voice ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Voice OFF</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={startNewConversation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            title="New Chat"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          {currentConvId && (
            <button
              onClick={() => handleDeleteConversation(currentConvId)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
              title="Delete conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Offline Alert Bar */}
      {!isOnline && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Device is currently offline. You can view message history and local data.</span>
        </div>
      )}

      {/* Speaking Indicator */}
      {isSpeaking && (
        <div className="px-4 py-1.5 bg-blue-600/20 border-b border-blue-500/30 flex items-center justify-between text-xs text-blue-300">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 animate-pulse text-blue-400" />
            <span>MY AGENT is speaking...</span>
          </div>
          <button
            onClick={stopSpeaking}
            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold"
          >
            Stop Voice
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorBanner && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">How can MY AGENT assist you today?</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Ask questions, dictate with your microphone, attach phone photos, or test the Approval Engine.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left w-full max-w-md">
              <button
                onClick={() => setInputText('Inspect current operating status and local memory counts.')}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition"
              >
                📊 "Check app operating status"
              </button>
              <button
                onClick={() => setInputText('Remember that my project deadline is next Friday.')}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition"
              >
                🧠 "Save project deadline to memory"
              </button>
              <button
                onClick={() => setInputText('Propose an action plan to prepare for a software launch next week.')}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition"
              >
                ⚡ "Propose a launch action plan"
              </button>
              <button
                onClick={() => setInputText('Simulate an external sync with api.example.com to test approval.')}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition"
              >
                🛡️ "Simulate external sync"
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-2xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-blue-400 border border-slate-700'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-2 max-w-[85%] sm:max-w-[88%]">
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed relative group ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : msg.status === 'error'
                      ? 'bg-rose-950/40 text-rose-200 border border-rose-800/50 rounded-tl-none'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Speaker icon for assistant message */}
                  {msg.role === 'assistant' && isTtsSupported && (
                    <button
                      onClick={() => (isSpeaking ? stopSpeaking() : speak(msg.content))}
                      className="mt-2 flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 pt-1 border-t border-slate-800/60 transition"
                      title="Speak response out loud"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </button>
                  )}
                </div>

                {/* Embedded Tool Proposal Cards */}
                {msg.toolProposals && msg.toolProposals.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {msg.toolProposals.map((prop, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2 shadow-lg"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                            {prop.actionName}
                          </span>
                          <RiskBadge risk={prop.riskLevel} size="sm" />
                        </div>

                        <p className="text-slate-400 text-[11px]">{prop.description}</p>

                        <div className="p-2 rounded-lg bg-slate-950/60 font-mono text-[10px] text-slate-400">
                          <div>Target: {prop.target}</div>
                          <div>Data affected: {prop.dataAffected}</div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-500">
                            Sent to Approval Engine
                          </span>
                          <button
                            onClick={onNavigateToApprovals}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition"
                          >
                            <span>Open in Approvals</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`text-[10px] text-slate-500 px-1 ${
                    msg.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3 max-w-2xl">
            <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span>MY AGENT is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview Chip */}
      {attachedFileInfo && (
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 truncate">
            {attachedFileInfo.preview ? (
              <img
                src={attachedFileInfo.preview}
                alt="preview"
                className="w-6 h-6 rounded object-cover border border-slate-700"
              />
            ) : (
              <Paperclip className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span className="truncate">{attachedFileInfo.name}</span>
          </div>
          <button
            onClick={() => setAttachedFileInfo(null)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-2"
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          accept="image/*,.pdf,.txt,.doc,.docx"
          className="hidden"
        />

        {/* Paperclip / File Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Attach photo or file from phone"
        >
          <Paperclip className="w-4 h-4 text-blue-400" />
        </button>

        {/* Voice Input Microphone Button */}
        {isVoiceSupported && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-2.5 rounded-xl transition ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={isListening ? 'Stop voice recording' : 'Dictate with voice'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isListening
              ? 'Listening to your voice...'
              : !isOnline
              ? 'Offline — Gemini AI currently unavailable...'
              : 'Ask MY AGENT anything or give an instruction...'
          }
          disabled={!isOnline || isLoading}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={(!inputText.trim() && !attachedFileInfo) || isLoading || !isOnline}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-40 disabled:hover:bg-blue-600 text-white shadow-md shadow-blue-600/30 transition shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
