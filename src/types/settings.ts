export interface AppSettings {
  shareMemoriesWithAI: boolean;
  strictApprovalMode: boolean; // if true, even READ tools prompt for approval
  systemInstructions: string;
  autoExpireApprovalsHours: number;
  offlineModePreferred: boolean;
  hapticFeedbackEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  shareMemoriesWithAI: true,
  strictApprovalMode: false,
  systemInstructions: 'You are MY AGENT, a trusted, precise, and proactive personal AI operating system.',
  autoExpireApprovalsHours: 24,
  offlineModePreferred: false,
  hapticFeedbackEnabled: true,
};
