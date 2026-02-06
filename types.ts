export interface Contact {
  id: string;
  name: string;
  lineId: string; // Basic ID like @username
  lineUserId?: string; // LINE User ID for messaging (starts with 'U')
  tier: 'Gold' | 'Silver' | 'Bronze';
  interests: string[];
  lastInteraction: string;
  avatarUrl: string;
}

export interface PersonalizedMessage {
  contactId: string;
  originalMessage: string;
  customizedMessage: string;
  status: 'pending' | 'generated' | 'sending' | 'sent' | 'failed';
}

export interface Campaign {
  id: string;
  name: string;
  baseMessage: string;
  targetSegment: string;
  createdAt: string;
  messages: PersonalizedMessage[];
}

// Navigation types
export enum View {
  DASHBOARD = 'DASHBOARD',
  CONTACTS = 'CONTACTS',
  CAMPAIGN_NEW = 'CAMPAIGN_NEW',
  SETTINGS = 'SETTINGS',
}