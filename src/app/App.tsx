import React, { useState, useEffect } from 'react';
import { AppLayout, NavTab } from './layout/AppLayout';
import { DashboardView } from '../components/dashboard/DashboardView';
import { ChatView } from '../components/chat/ChatView';
import { MemoryView } from '../components/memory/MemoryView';
import { ApprovalCenter } from '../components/approval/ApprovalCenter';
import { AuditLogView } from '../components/audit/AuditLogView';
import { SettingsView } from '../components/settings/SettingsView';
import { VoiceCallModal } from '../components/call/VoiceCallModal';
import { getPendingApprovals } from '../db/approvals';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [isCallModalOpen, setIsCallModalOpen] = useState<boolean>(false);

  const refreshPendingCount = async () => {
    try {
      const pending = await getPendingApprovals();
      setPendingApprovalsCount(pending.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (
    tab: NavTab,
    conversationId?: string
  ) => {
    if (conversationId) {
      setSelectedConversationId(conversationId);
    }
    setActiveTab(tab);
    refreshPendingCount();
  };

  const handleNewChat = () => {
    setSelectedConversationId(undefined);
    setActiveTab('chat');
    refreshPendingCount();
  };

  return (
    <>
      <AppLayout
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          refreshPendingCount();
        }}
        pendingApprovalsCount={pendingApprovalsCount}
        onStartCall={() => setIsCallModalOpen(true)}
      >
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={handleNavigate}
            onNewChat={handleNewChat}
            onStartCall={() => setIsCallModalOpen(true)}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            initialConversationId={selectedConversationId}
            onNavigateToApprovals={() => handleNavigate('approvals')}
            onStartCall={() => setIsCallModalOpen(true)}
          />
        )}

        {activeTab === 'memory' && <MemoryView />}

        {activeTab === 'approvals' && <ApprovalCenter />}

        {activeTab === 'activity' && <AuditLogView />}

        {activeTab === 'settings' && <SettingsView />}
      </AppLayout>

      {/* Fullscreen Mobile Voice Call UI matching user screenshot */}
      <VoiceCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        conversationId={selectedConversationId}
        onNavigateToTab={handleNavigate}
      />
    </>
  );
}
