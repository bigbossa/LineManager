import { Contact } from "./types";

export const MOCK_CONTACTS: Contact[] = [
  {
    id: 'u1',
    name: 'Somchai (CEO)',
    lineId: '@somchai_biz',
    lineUserId: 'U1234567890abcdef1234567890abcdef', // Demo LINE User ID
    tier: 'Gold',
    interests: ['Technology', 'Investment', 'Golf'],
    lastInteraction: '2 hours ago',
    avatarUrl: 'https://picsum.photos/seed/somchai/200'
  },
  {
    id: 'u2',
    name: 'Nong May',
    lineId: '@may_fashion',
    lineUserId: 'U2345678901abcdef2345678901abcdef', // Demo LINE User ID
    tier: 'Silver',
    interests: ['Fashion', 'Cosmetics', 'Sale Promotions'],
    lastInteraction: '1 day ago',
    avatarUrl: 'https://picsum.photos/seed/may/200'
  },
  {
    id: 'u3',
    name: 'John Smith',
    lineId: '@johnny_travel',
    lineUserId: 'U3456789012abcdef3456789012abcdef', // Demo LINE User ID
    tier: 'Bronze',
    interests: ['Travel', 'Food', 'Budget Deals'],
    lastInteraction: '5 days ago',
    avatarUrl: 'https://picsum.photos/seed/john/200'
  },
  {
    id: 'u4',
    name: 'K. Pranee',
    lineId: '@pranee_home',
    lineUserId: 'U4567890123abcdef4567890123abcdef', // Demo LINE User ID
    tier: 'Gold',
    interests: ['Home Decor', 'Cooking', 'Family'],
    lastInteraction: '1 week ago',
    avatarUrl: 'https://picsum.photos/seed/pranee/200'
  }
];

export const INITIAL_CAMPAIGN_MESSAGE = "We are launching a new premium service next week! Check it out for exclusive early bird discounts.";