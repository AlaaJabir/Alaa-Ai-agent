import React, { useState, useEffect } from 'react';
import { AppLayout, NavTab } from './layout/AppLayout';
import { DashboardView } from '../components/dashboard/DashboardView';
import { ChatView } from '../components/chat/ChatView';
import { MemoryView } from '../components/memory/MemoryView';
import { ApprovalCenter } from '../components/approval/ApprovalCenter';
import { AuditLogView } from '../components/audit/AuditLogView';
import { SettingsView } from '../components/settings/SettingsView';
import { getPendingApprovals } from '../db/approvals';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

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
    tab: 'chat' | 'memory' | 'approvals' | 'activity' | 'settings',
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
    <AppLayout
      activeTab={activeTab}
      onSelectTab={(tab) => {
        setActiveTab(tab);
        refreshPendingCount();
      }}
      pendingApprovalsCount={pendingApprovalsCount}
    >
      {activeTab === 'dashboard' && (
        <DashboardView onNavigate={handleNavigate} onNewChat={handleNewChat} />
      )}

      {activeTab === 'chat' && (
        <ChatView
          initialConversationId={selectedConversationId}
          onNavigateToApprovals={() => handleNavigate('approvals')}
        />
      )}

      {activeTab === 'memory' && <MemoryView />}

      {activeTab === 'approvals' && <ApprovalCenter />}

      {activeTab === 'activity' && <AuditLogView />}

      {activeTab === 'settings' && <SettingsView />}
    </AppLayout>
  );
}
