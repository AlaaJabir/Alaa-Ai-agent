import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  FileText,
  Menu,
  Plus,
  Send,
  Sparkles,
  Check,
  ChevronDown,
} from 'lucide-react';
import { GeminiClient } from '../../core/ai/geminiClient';
import { MemoryService } from '../../core/memory/memoryService';
import { ApprovalEngine } from '../../core/approval/approvalEngine';
import { saveMessage } from '../../db/messages';
import { saveConversation, getConversation } from '../../db/conversations';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { ChatMessage, ToolCallProposal } from '../../types/chat';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  onNavigateToTab?: (tab: 'dashboard' | 'chat' | 'memory' | 'approvals' | 'activity' | 'settings') => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  onNavigateToTab,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [callState, setCallState] = useState<'connecting' | 'listening' | 'thinking' | 'speaking' | 'idle'>('connecting');
  const [activeMessage, setActiveMessage] = useState('');
  const [lastAIResponse, setLastAIResponse] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [activeConvId, setActiveConvId] = useState(conversationId);
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const { isSpeaking, speak, stop: stopSpeaking } = useTextToSpeech();

  // Call timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      setCallDuration(0);
      setCallState('listening');
      playTone(440, 0.1); // subtle chime
      timer = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);

      // Start listening if not muted
      if (!isMuted) {
        startListening();
      }
    } else {
      stopListening();
      stopSpeaking();
    }

    return () => {
      clearInterval(timer);
      stopListening();
      stopSpeaking();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen]);

  // Audio tone synthesizer for call start/end
  const playTone = (freq: number, duration: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore
    }
  };

  // Sync state with transcript and voice synthesis
  useEffect(() => {
    if (isSpeaking) {
      setCallState('speaking');
    } else if (isListening) {
      setCallState('listening');
    } else if (callState !== 'thinking') {
      setCallState('idle');
    }
  }, [isSpeaking, isListening]);

  // When speech transcript changes
  useEffect(() => {
    if (transcript && transcript.trim()) {
      setActiveMessage(transcript);
    }
  }, [transcript]);

  // Handle user silence / submit voice query
  const handleVoiceQuery = async (queryText: string) => {
    const text = queryText.trim();
    if (!text) return;

    setCallState('thinking');
    stopListening();

    let targetConvId = activeConvId;
    if (!targetConvId) {
      targetConvId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setActiveConvId(targetConvId);
      await saveConversation({
        id: targetConvId,
        title: `Voice Call • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        preview: text.slice(0, 50),
      });
    }

    // Save user message to IndexedDB
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: targetConvId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'sent',
    };
    await saveMessage(userMsg);
    resetTranscript();

    try {
      const contextMemories = await MemoryService.getContextForAI();
      const response = await GeminiClient.sendMessage({
        message: text,
        conversationId: targetConvId,
        contextMemories,
      });

      // Handle tool proposals if any
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
            conversationId: targetConvId,
          });

          toolProposals.push({
            ...prop,
            approvalId: proposalResult.request?.id,
          });
        }
      }

      // Save assistant message to IndexedDB
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        conversationId: targetConvId,
        role: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        toolProposals: toolProposals.length > 0 ? toolProposals : undefined,
        status: 'sent',
      };
      await saveMessage(assistantMsg);

      // Update conversation
      const conv = await getConversation(targetConvId);
      if (conv) {
        conv.preview = response.text.slice(0, 60);
        conv.updatedAt = Date.now();
        await saveConversation(conv);
      }

      setLastAIResponse(response.text);
      setActiveMessage('');

      // Speak back
      if (isSpeakerOn) {
        setCallState('speaking');
        speak(response.text);
      } else {
        setCallState('idle');
      }
    } catch (err: any) {
      setLastAIResponse(`Sorry, I couldn't process that: ${err?.message || 'Server error'}`);
      setCallState('idle');
    }
  };

  const handleEndCall = () => {
    playTone(280, 0.15); // subtle end chime
    stopListening();
    stopSpeaking();
    onClose();
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      startListening();
    } else {
      setIsMuted(true);
      stopListening();
    }
  };

  const handleSendTypedMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) return;
    const msg = textInput.trim();
    setTextInput('');
    handleVoiceQuery(msg);
  };

  // Canvas visualizer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      const numBars = 32;
      const barWidth = 3;
      const gap = 5;
      const totalWidth = numBars * (barWidth + gap);
      const startX = (width - totalWidth) / 2;

      for (let i = 0; i < numBars; i++) {
        let amplitude = 4;
        if (callState === 'speaking') {
          amplitude = Math.sin(phase + i * 0.3) * 16 + 18;
        } else if (callState === 'listening' && activeMessage) {
          amplitude = Math.abs(Math.sin(phase * 1.5 + i * 0.4)) * 14 + 10;
        } else if (callState === 'thinking') {
          amplitude = Math.sin(phase * 0.8 + i * 0.2) * 8 + 6;
        } else {
          amplitude = Math.sin(phase * 0.3 + i * 0.15) * 3 + 4;
        }

        const x = startX + i * (barWidth + gap);
        const barHeight = Math.max(3, amplitude);

        // Gradient for bars
        const grad = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
        if (callState === 'speaking') {
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(0.5, '#818cf8');
          grad.addColorStop(1, '#c084fc');
        } else if (callState === 'listening') {
          grad.addColorStop(0, '#fbbf24');
          grad.addColorStop(0.5, '#f97316');
          grad.addColorStop(1, '#ef4444');
        } else if (callState === 'thinking') {
          grad.addColorStop(0, '#60a5fa');
          grad.addColorStop(1, '#3b82f6');
        } else {
          grad.addColorStop(0, '#475569');
          grad.addColorStop(1, '#334155');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight, barWidth, barHeight * 2, 2);
        ctx.fill();
      }

      phase += 0.08;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, callState, activeMessage]);

  if (!isOpen) return null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05070e] text-white overflow-hidden select-none animate-in fade-in duration-300">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[100px] transition-all duration-700 ${
            callState === 'speaking'
              ? 'bg-purple-600/25'
              : callState === 'listening'
              ? 'bg-amber-500/25'
              : callState === 'thinking'
              ? 'bg-blue-600/30'
              : 'bg-blue-900/15'
          }`}
        />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#020408] to-transparent" />
      </div>

      {/* Top Header Bar matching user screenshot */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-safe pt-4 pb-2">
        {/* Left circular hamburger button */}
        <button
          onClick={() => {
            if (onNavigateToTab) {
              onClose();
              onNavigateToTab('dashboard');
            } else {
              onClose();
            }
          }}
          className="w-11 h-11 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-200 active:scale-95 transition shadow-lg"
          title="Menu / Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Center Title & Status */}
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold tracking-wide text-slate-200">New Chat</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                callState === 'speaking'
                  ? 'bg-purple-400'
                  : callState === 'listening'
                  ? 'bg-amber-400'
                  : callState === 'thinking'
                  ? 'bg-blue-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="text-[11px] font-mono text-slate-400">
              {callState === 'speaking'
                ? 'AI Speaking...'
                : callState === 'thinking'
                ? 'Thinking...'
                : callState === 'listening'
                ? 'Listening...'
                : formatDuration(callDuration)}
            </span>
          </div>
        </div>

        {/* Right circular document / transcript button */}
        <button
          onClick={() => {
            if (onNavigateToTab) {
              onClose();
              onNavigateToTab('chat');
            } else {
              onClose();
            }
          }}
          className="w-11 h-11 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-slate-200 active:scale-95 transition shadow-lg"
          title="View Chat Transcript"
        >
          <FileText className="w-5 h-5" />
        </button>
      </header>

      {/* Main Center Area: Holographic 3D Avatar Head & Typographic Question */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto w-full">
        {/* Avatar Container with pulse glow */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center -mt-6">
          {/* Subtle concentric rings */}
          <div
            className={`absolute inset-0 rounded-full border border-blue-500/20 transition-transform duration-1000 ${
              callState === 'speaking' || callState === 'listening'
                ? 'scale-110 opacity-70'
                : 'scale-100 opacity-30'
            }`}
          />
          <div
            className={`absolute -inset-4 rounded-full border border-indigo-500/10 transition-transform duration-1000 ${
              callState === 'speaking' ? 'scale-120 opacity-50' : 'scale-95 opacity-20'
            }`}
          />

          {/* Avatar Image matching screenshot with holographic treatment */}
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full overflow-hidden shadow-2xl border border-blue-500/30">
            <img
              src="/avatar.jpg"
              alt="MY AGENT Digital Avatar"
              className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
            />
            {/* Holographic scanline overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent mix-blend-overlay pointer-events-none" />
          </div>
        </div>

        {/* Audio Frequency Waveform */}
        <div className="w-full h-10 my-1 flex items-center justify-center">
          <canvas ref={canvasRef} width={280} height={40} className="w-64 h-8" />
        </div>

        {/* Typographic Hero Question matching screenshot */}
        <div className="mt-2 text-left w-full pl-2">
          <p className="text-sm font-medium text-slate-400 mb-1">Hello, Alex!</p>
          <h1 className="text-3xl sm:text-4xl leading-tight tracking-tight text-slate-300">
            How <span className="font-extrabold text-white">can</span>
            <br />
            <span className="font-extrabold text-white">I help</span> you?
          </h1>

          {/* Live speech or response subtitle */}
          <div className="mt-3 min-h-[36px]">
            {activeMessage ? (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl inline-flex items-center gap-2 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>&ldquo;{activeMessage}&rdquo;</span>
              </p>
            ) : lastAIResponse ? (
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl">
                {lastAIResponse}
              </p>
            ) : (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Speak naturally or tap the mic below to ask anything</span>
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Bar matching screenshot */}
      <footer className="relative z-10 px-5 pb-safe pb-5 pt-2 max-w-md mx-auto w-full space-y-3">
        <div className="flex items-center gap-3">
          {/* Left circular Plus button */}
          <button
            type="button"
            onClick={() => setShowToolsDrawer(!showToolsDrawer)}
            className="w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-200 active:scale-95 transition shadow-lg shrink-0"
            title="Quick Options"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Center Pill Input: "Message..." with Mic inside */}
          <form
            onSubmit={handleSendTypedMessage}
            className="flex-1 relative flex items-center bg-slate-900/90 border border-slate-800/90 rounded-full px-4 py-2.5 shadow-inner"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Message..."
              className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none pr-8"
            />

            {/* Mic inside pill */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`absolute right-3 p-1 rounded-full transition ${
                isMuted
                  ? 'text-rose-400'
                  : isListening
                  ? 'text-amber-400 animate-pulse'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </form>

          {/* Right Circular Send / Call Action Button matching screenshot */}
          {textInput.trim() ? (
            <button
              type="button"
              onClick={() => handleSendTypedMessage()}
              className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white active:scale-95 transition shadow-lg shadow-blue-600/30 shrink-0"
              title="Send Message"
            >
              <Send className="w-5 h-5 -ml-0.5 mt-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEndCall}
              className="w-12 h-12 rounded-full bg-blue-600 hover:bg-rose-600 flex items-center justify-center text-white active:scale-95 transition shadow-lg shadow-blue-600/30 group shrink-0"
              title="End Voice Call"
            >
              {/* Paperplane default, hover/active becomes PhoneOff */}
              <Send className="w-5 h-5 -ml-0.5 mt-0.5 group-hover:hidden" />
              <PhoneOff className="w-5 h-5 hidden group-hover:block text-white" />
            </button>
          )}
        </div>

        {/* Quick Tools Drawer (when clicking + button) */}
        {showToolsDrawer && (
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs animate-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => {
                setShowToolsDrawer(false);
                handleVoiceQuery('Inspect current operating status and local memory counts.');
              }}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800/60"
            >
              📊 Status
            </button>
            <button
              onClick={() => {
                setShowToolsDrawer(false);
                handleVoiceQuery('Save a new preference to my memory.');
              }}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800/60"
            >
              🧠 Memory
            </button>
            <button
              onClick={() => {
                setShowToolsDrawer(false);
                handleEndCall();
              }}
              className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30"
            >
              🔴 End Call
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};
