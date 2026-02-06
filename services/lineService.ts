// LINE Messaging API Service
// Use proxy to avoid CORS issues (dev mode)
const LINE_API_BASE = '/line-api/v2/bot';

export interface LineConfig {
  channelAccessToken: string;
  channelId: string;
}

export interface LineMessage {
  type: 'text';
  text: string;
}

export interface PushMessageRequest {
  to: string; // LINE User ID
  messages: LineMessage[];
}

export interface BroadcastMessageRequest {
  messages: LineMessage[];
}

// Store config in localStorage
const CONFIG_KEY = 'line_messaging_config';

export const saveLineConfig = (config: LineConfig): void => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const getLineConfig = (): LineConfig | null => {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const clearLineConfig = (): void => {
  localStorage.removeItem(CONFIG_KEY);
};

export const isLineConfigured = (): boolean => {
  const config = getLineConfig();
  return !!(config?.channelAccessToken && config?.channelId);
};

// Push message to a specific user
export const pushMessage = async (
  userId: string,
  message: string
): Promise<{ success: boolean; error?: string }> => {
  const config = getLineConfig();
  if (!config?.channelAccessToken) {
    return { success: false, error: 'LINE API not configured' };
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: 'text', text: message }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

// Broadcast message to all followers
export const broadcastMessage = async (
  message: string
): Promise<{ success: boolean; error?: string }> => {
  const config = getLineConfig();
  if (!config?.channelAccessToken) {
    return { success: false, error: 'LINE API not configured' };
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/message/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.channelAccessToken}`,
      },
      body: JSON.stringify({
        messages: [{ type: 'text', text: message }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

// Multicast - send to multiple users
export const multicastMessage = async (
  userIds: string[],
  message: string
): Promise<{ success: boolean; error?: string }> => {
  const config = getLineConfig();
  if (!config?.channelAccessToken) {
    return { success: false, error: 'LINE API not configured' };
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/message/multicast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.channelAccessToken}`,
      },
      body: JSON.stringify({
        to: userIds,
        messages: [{ type: 'text', text: message }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

// Send personalized messages to multiple users (one by one with different content)
export const sendPersonalizedMessages = async (
  messages: { userId: string; message: string }[]
): Promise<{
  success: boolean;
  results: { userId: string; success: boolean; error?: string }[];
}> => {
  const results = await Promise.all(
    messages.map(async ({ userId, message }) => {
      const result = await pushMessage(userId, message);
      return { userId, ...result };
    })
  );

  const allSuccess = results.every((r) => r.success);
  return { success: allSuccess, results };
};

// Get bot info to verify token
export const getBotInfo = async (): Promise<{
  success: boolean;
  data?: { displayName: string; userId: string; pictureUrl?: string };
  error?: string;
}> => {
  const config = getLineConfig();
  if (!config?.channelAccessToken) {
    return { success: false, error: 'LINE API not configured' };
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/info`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.channelAccessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

// Get follower IDs
export const getFollowerIds = async (
  start?: string
): Promise<{
  success: boolean;
  data?: { userIds: string[]; next?: string };
  error?: string;
}> => {
  const config = getLineConfig();
  if (!config?.channelAccessToken) {
    return { success: false, error: 'LINE API not configured' };
  }

  try {
    const url = start
      ? `${LINE_API_BASE}/followers/ids?start=${start}`
      : `${LINE_API_BASE}/followers/ids`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.channelAccessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

// Get user profile by ID
export const getUserProfile = async (
  userId: string
): Promise<{
  success: boolean;
  data?: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
    language?: string;
  };
  error?: string;
}> => {
  const config = getLineConfig();
  if (!config?.channelAccessToken) {
    return { success: false, error: 'LINE API not configured' };
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.channelAccessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

// Get all followers with profiles
export const getAllFollowers = async (): Promise<{
  success: boolean;
  data?: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  }[];
  error?: string;
}> => {
  // First get all follower IDs
  const idsResult = await getFollowerIds();
  if (!idsResult.success || !idsResult.data) {
    return { success: false, error: idsResult.error };
  }

  const userIds = idsResult.data.userIds;
  if (userIds.length === 0) {
    return { success: true, data: [] };
  }

  // Get profiles for each user (limit to first 50 to avoid rate limiting)
  const limitedIds = userIds.slice(0, 50);
  const profiles = await Promise.all(
    limitedIds.map(async (userId) => {
      const result = await getUserProfile(userId);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    })
  );

  const validProfiles = profiles.filter((p) => p !== null) as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  }[];

  return { success: true, data: validProfiles };
};
