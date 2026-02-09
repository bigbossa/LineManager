import React, { useState, useEffect, useMemo } from 'react';
import { Contact, PersonalizedMessage, View } from './types';
import { INITIAL_CAMPAIGN_MESSAGE } from './constants';
import { generatePersonalizedBulk } from './services/geminiService';
import { PhonePreview } from './components/PhonePreview';
import { ApiKeyModal } from './components/ApiKeyModal';
import { LineConfigModal } from './components/LineConfigModal';
import { isLineConfigured, getLineConfig, sendPersonalizedMessages, pushMessage, getBotInfo, getAllFollowers, broadcastMessage, LineConfig } from './services/lineService';

// Icons
import { Users, Send, LayoutDashboard, Settings, MessageSquare, Wand2, CheckCircle2, Loader2, ArrowRight, Filter, X, RefreshCw, Radio, UserPlus, Trash2 } from 'lucide-react';

// Load saved contacts from localStorage (filter out old mock data)
const loadSavedContacts = (): Contact[] => {
  const saved = localStorage.getItem('line_contacts');
  if (saved) {
    try {
      const contacts = JSON.parse(saved) as Contact[];
      // Filter out mock contacts (they have demo User IDs like U1234567890abcdef...)
      const realContacts = contacts.filter(c => 
        !c.lineUserId?.match(/^U[0-9]{10}abcdef[0-9]{10}abcdef$/)
      );
      return realContacts;
    } catch {
      return [];
    }
  }
  return [];
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.CAMPAIGN_NEW);
  const [contacts, setContacts] = useState<Contact[]>(loadSavedContacts());
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  
  // Filter State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState<string[]>(['Gold', 'Silver', 'Bronze']);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Calculate unique interests from contacts
  const allInterests = useMemo(() => {
    const interests = new Set<string>();
    contacts.forEach(c => c.interests.forEach(i => interests.add(i)));
    return Array.from(interests);
  }, [contacts]);

  // Save contacts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('line_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Auto-select new interests when contacts change
  useEffect(() => {
    if (allInterests.length > 0) {
      // Add any new interests to selected interests
      setSelectedInterests(prev => {
        const newInterests = allInterests.filter(i => !prev.includes(i));
        if (newInterests.length > 0) {
          return [...prev, ...newInterests];
        }
        return prev.length === 0 ? allInterests : prev;
      });
    }
  }, [allInterests]);

  // Filter Logic - if no filters, show all contacts
  const filteredContacts = useMemo(() => {
    if (contacts.length === 0) return [];
    if (selectedInterests.length === 0) return contacts.filter(c => selectedTiers.includes(c.tier));
    
    return contacts.filter(contact => {
      const tierMatch = selectedTiers.includes(contact.tier);
      const interestMatch = contact.interests.length === 0 || contact.interests.some(i => selectedInterests.includes(i));
      return tierMatch && interestMatch;
    });
  }, [contacts, selectedTiers, selectedInterests]);

  const [baseMessage, setBaseMessage] = useState(INITIAL_CAMPAIGN_MESSAGE);
  const [generatedMessages, setGeneratedMessages] = useState<PersonalizedMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPreviewContactId, setSelectedPreviewContactId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Add Contact Modal State
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    lineUserId: '',
    tier: 'Bronze' as 'Gold' | 'Silver' | 'Bronze',
    interests: '',
  });

  // LINE Config State
  const [isLineConfigModalOpen, setIsLineConfigModalOpen] = useState(false);
  const [lineConfigured, setLineConfigured] = useState(isLineConfigured());
  const [botInfo, setBotInfo] = useState<{ displayName: string; userId: string; pictureUrl?: string; basicId?: string } | null>(null);
  const [isFetchingBotInfo, setIsFetchingBotInfo] = useState(false);

  // Fetch bot info when LINE is configured
  useEffect(() => {
    const fetchBotInfo = async () => {
      if (lineConfigured) {
        setIsFetchingBotInfo(true);
        const result = await getBotInfo();
        if (result.success && result.data) {
          setBotInfo(result.data);
        }
        setIsFetchingBotInfo(false);
      } else {
        setBotInfo(null);
      }
    };
    fetchBotInfo();
  }, [lineConfigured]);

  // Fetch LINE followers when configured
  useEffect(() => {
    const fetchFollowers = async () => {
      if (lineConfigured) {
        setIsLoadingContacts(true);
        const result = await getAllFollowers();
        if (result.success && result.data && result.data.length > 0) {
          // Convert LINE profiles to Contact format
          const lineContacts: Contact[] = result.data.map((profile, index) => ({
            id: profile.userId,
            name: profile.displayName,
            lineId: profile.userId.slice(0, 10) + '...',
            lineUserId: profile.userId,
            tier: (['Gold', 'Silver', 'Bronze'] as const)[index % 3],
            interests: ['LINE Follower'],
            lastInteraction: 'Recently',
            avatarUrl: profile.pictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&background=06C755&color=fff`,
          }));
          setContacts(lineContacts);
        } else {
          // Keep using mock data if API fails (e.g., 403 for unverified accounts)
          console.log('Using mock contacts - LINE Followers API may require verified account');
        }
        setIsLoadingContacts(false);
      }
    };
    fetchFollowers();
  }, [lineConfigured]);

  // Effect to select first available contact when filter changes
  useEffect(() => {
    if (filteredContacts.length > 0) {
        // If current selection is not in filtered list, reset to first
        if (!selectedPreviewContactId || !filteredContacts.find(c => c.id === selectedPreviewContactId)) {
            setSelectedPreviewContactId(filteredContacts[0].id);
        }
    } else {
        setSelectedPreviewContactId(null);
    }
  }, [filteredContacts, selectedPreviewContactId]);

  // Computed
  const currentPreviewMessage = selectedPreviewContactId 
    ? generatedMessages.find(m => m.contactId === selectedPreviewContactId)?.customizedMessage || baseMessage
    : (filteredContacts.length > 0 ? "Select a user to preview" : "No users match your filter");
  
  const currentPreviewContact = selectedPreviewContactId 
    ? contacts.find(c => c.id === selectedPreviewContactId) 
    : (filteredContacts[0] || contacts[0]);

  const handleGenerate = async () => {
    if (filteredContacts.length === 0) return;

    setIsGenerating(true);
    setGeneratedMessages([]); // Reset
    try {
      const results = await generatePersonalizedBulk(baseMessage, filteredContacts);
      
      const newMessages: PersonalizedMessage[] = results.map(r => ({
        contactId: r.contactId,
        originalMessage: baseMessage,
        customizedMessage: r.message,
        status: 'generated'
      }));

      setGeneratedMessages(newMessages);
    } catch (error) {
      console.error("Failed to generate", error);
      alert("Failed to generate messages. Please ensure you have a valid API Key selected.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!lineConfigured) {
      alert('Please configure LINE Messaging API first in Settings.');
      setCurrentView(View.SETTINGS);
      return;
    }

    if (generatedMessages.length === 0) {
      alert('Please generate personalized messages first.');
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      // Prepare messages to send
      const messagesToSend = generatedMessages.map(msg => {
        const contact = contacts.find(c => c.id === msg.contactId);
        return {
          userId: contact?.lineUserId || contact?.lineId || msg.contactId, // Use lineUserId (actual LINE User ID)
          message: msg.customizedMessage,
        };
      });

      // Send personalized messages via LINE API
      const result = await sendPersonalizedMessages(messagesToSend);

      if (result.success) {
        setSendSuccess(true);
        setGeneratedMessages(prev => prev.map(m => ({ ...m, status: 'sent' })));
        setTimeout(() => setSendSuccess(false), 3000);
      } else {
        // Check partial success
        const successCount = result.results.filter(r => r.success).length;
        const failCount = result.results.filter(r => !r.success).length;
        
        if (successCount > 0) {
          setSendSuccess(true);
          setTimeout(() => setSendSuccess(false), 3000);
        }

        if (failCount > 0) {
          const errors = result.results
            .filter(r => !r.success)
            .map(r => `${r.userId}: ${r.error}`)
            .join(', ');
          setSendError(`Failed to send ${failCount} messages: ${errors}`);
        }

        // Update statuses based on individual results
        setGeneratedMessages(prev =>
          prev.map(m => {
            const contact = contacts.find(c => c.id === m.contactId);
            const sendResult = result.results.find(
              r => r.userId === (contact?.lineUserId || contact?.lineId || m.contactId)
            );
            return {
              ...m,
              status: sendResult?.success ? 'sent' : 'failed',
            };
          })
        );
      }
    } catch (error) {
      console.error('Failed to send messages:', error);
      setSendError(error instanceof Error ? error.message : 'Failed to send messages');
    } finally {
      setIsSending(false);
    }
  };

  // Broadcast to ALL followers (no User ID needed)
  const handleBroadcast = async () => {
    if (!lineConfigured) {
      alert('Please configure LINE Messaging API first in Settings.');
      setCurrentView(View.SETTINGS);
      return;
    }

    if (!baseMessage.trim()) {
      alert('Please enter a message to broadcast.');
      return;
    }

    const confirmSend = window.confirm(
      `🔊 BROADCAST MESSAGE\n\nThis will send the following message to ALL your LINE followers:\n\n"${baseMessage.slice(0, 100)}${baseMessage.length > 100 ? '...' : ''}"\n\nContinue?`
    );

    if (!confirmSend) return;

    setIsBroadcasting(true);
    setSendError(null);

    try {
      const result = await broadcastMessage(baseMessage);

      if (result.success) {
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 5000);
      } else {
        setSendError(`Broadcast failed: ${result.error}`);
        alert(`Broadcast failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to broadcast:', error);
      setSendError(error instanceof Error ? error.message : 'Failed to broadcast');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Add new contact
  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.lineUserId.trim()) {
      alert('Please enter name and LINE User ID');
      return;
    }

    const contact: Contact = {
      id: `custom_${Date.now()}`,
      name: newContact.name.trim(),
      lineId: newContact.lineUserId.slice(0, 10) + '...',
      lineUserId: newContact.lineUserId.trim(),
      tier: newContact.tier,
      interests: newContact.interests.split(',').map(i => i.trim()).filter(i => i),
      lastInteraction: 'Just added',
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newContact.name)}&background=06C755&color=fff`,
    };

    setContacts(prev => [...prev, contact]);
    setNewContact({ name: '', lineUserId: '', tier: 'Bronze', interests: '' });
    setIsAddContactModalOpen(false);
  };

  // Delete contact
  const handleDeleteContact = (contactId: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      setContacts(prev => prev.filter(c => c.id !== contactId));
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  const toggleTier = (tier: string) => {
    if (selectedTiers.includes(tier)) {
      setSelectedTiers(prev => prev.filter(t => t !== tier));
    } else {
      setSelectedTiers(prev => [...prev, tier]);
    }
  };

  const renderFilterModal = () => {
    if (!isFilterModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 transform transition-all scale-100">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <Filter className="w-5 h-5 mr-2 text-green-600" />
              Filter Target Audience
            </h3>
            <button onClick={() => setIsFilterModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Tiers */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Customer Tier</label>
            <div className="flex space-x-4">
              {['Gold', 'Silver', 'Bronze'].map(tier => (
                <label key={tier} className="flex items-center space-x-2 cursor-pointer select-none group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedTiers.includes(tier) ? 'bg-green-600 border-green-600' : 'border-gray-300 group-hover:border-green-400'}`}>
                    {selectedTiers.includes(tier) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={selectedTiers.includes(tier)}
                    onChange={() => toggleTier(tier)}
                  />
                  <span className={`text-sm ${selectedTiers.includes(tier) ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{tier}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Interests (Match Any)</label>
            <div className="flex flex-wrap gap-2">
              {allInterests.map(interest => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border 
                      ${isSelected 
                        ? 'bg-green-50 text-green-700 border-green-200 ring-1 ring-green-200' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                  >
                    {interest}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-50 -mx-6 -mb-6 p-4 flex justify-between items-center rounded-b-xl border-t border-gray-100">
            <div className="text-sm text-gray-600 flex items-center">
              Matches <strong className="mx-1 text-gray-900">{filteredContacts.length}</strong> of {contacts.length} users
            </div>
            <button 
              onClick={() => setIsFilterModalOpen(false)}
              className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="text-gray-500 text-sm font-medium uppercase mb-2">Total Contacts</div>
           <div className="text-4xl font-bold text-gray-900">{contacts.length}</div>
           <div className="text-green-500 text-xs mt-2 flex items-center">
             <ArrowRight className="w-3 h-3 mr-1" /> +2 this week
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="text-gray-500 text-sm font-medium uppercase mb-2">Campaigns Sent</div>
           <div className="text-4xl font-bold text-gray-900">12</div>
           <div className="text-gray-400 text-xs mt-2">Last sent: Yesterday</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <div className="text-gray-500 text-sm font-medium uppercase mb-2">Avg. Open Rate</div>
           <div className="text-4xl font-bold text-blue-600">68%</div>
           <div className="text-blue-400 text-xs mt-2">Higher than industry avg</div>
        </div>
      </div>
    </div>
  );

  const handleRefreshContacts = async () => {
    if (!lineConfigured) {
      alert('Please configure LINE Messaging API first');
      return;
    }
    setIsLoadingContacts(true);
    const result = await getAllFollowers();
    if (result.success && result.data && result.data.length > 0) {
      const lineContacts: Contact[] = result.data.map((profile, index) => ({
        id: profile.userId,
        name: profile.displayName,
        lineId: profile.userId.slice(0, 10) + '...',
        lineUserId: profile.userId,
        tier: (['Gold', 'Silver', 'Bronze'] as const)[index % 3],
        interests: ['LINE Follower'],
        lastInteraction: 'Recently',
        avatarUrl: profile.pictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&background=06C755&color=fff`,
      }));
      setContacts(lineContacts);
    } else if (result.error) {
      if (result.error.includes('403') || result.error.includes('Forbidden') || result.error.includes('not available')) {
        alert('Get Followers API requires a Verified LINE Official Account.\n\nYou can still send messages to users who message your bot first. Using sample contacts for demo.');
      } else {
        alert(`Failed to fetch contacts: ${result.error}`);
      }
    }
    setIsLoadingContacts(false);
  };

  const renderContacts = () => (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Contact List</h2>
          <p className="text-sm text-gray-500 mt-1">
            {contacts.length} contacts {lineConfigured ? '(demo data - Get Followers API requires verified account)' : '- Configure LINE in Settings'}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefreshContacts}
            disabled={isLoadingContacts || !lineConfigured}
            className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingContacts ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh from LINE
          </button>
          <button 
            onClick={() => setIsAddContactModalOpen(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <UserPlus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>
      
      {isLoadingContacts ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading contacts from LINE...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">LINE User ID</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Tier</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Info</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No contacts found. {!lineConfigured && 'Configure LINE API to fetch real followers.'}
                  </td>
                </tr>
              ) : (
                contacts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4 flex items-center">
                      <img src={c.avatarUrl} alt={c.name} className="w-8 h-8 rounded-full mr-3 object-cover" />
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </td>
                    <td className="p-4 text-gray-600 font-mono text-xs" title={c.lineUserId || c.lineId}>
                      {c.lineUserId ? `${c.lineUserId.slice(0, 8)}...${c.lineUserId.slice(-4)}` : c.lineId}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${c.tier === 'Gold' ? 'bg-yellow-100 text-yellow-800' : 
                          c.tier === 'Silver' ? 'bg-gray-100 text-gray-800' : 'bg-orange-50 text-orange-800'}`}>
                        {c.tier}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">{c.interests.slice(0, 2).join(', ')}{c.interests.length > 2 ? '...' : ''}</td>
                    <td className="p-4 text-green-600 text-xs font-medium">Active</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-red-50"
                        title="Delete contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Account Settings</h2>
      
      {/* Profile Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">LINE Profile</h3>
        {!lineConfigured ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🔗</div>
            <p>Please configure LINE Messaging API first</p>
            <button 
              onClick={() => setIsLineConfigModalOpen(true)}
              className="mt-4 text-green-600 font-medium hover:underline"
            >
              Configure Now
            </button>
          </div>
        ) : isFetchingBotInfo ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            <span className="ml-2 text-gray-500">Loading bot info...</span>
          </div>
        ) : botInfo ? (
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <img 
                src={botInfo.pictureUrl || 'https://via.placeholder.com/200?text=BOT'} 
                alt={botInfo.displayName} 
                className="w-24 h-24 rounded-full object-cover border-4 border-green-100 shadow-md" 
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Display Name</label>
                <div className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-medium text-gray-800">
                  {botInfo.displayName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bot User ID</label>
                <div className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono text-gray-600 truncate" title={botInfo.userId}>
                  {botInfo.userId}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Channel ID</label>
                <div className="w-full p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono text-gray-600">
                  {getLineConfig()?.channelId || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Failed to load bot info. Please check your configuration.</p>
          </div>
        )}
      </div>

      {/* Integration Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Integrations</h3>
        
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 mb-3">
           <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                 <Wand2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                 <div className="font-semibold text-gray-900 text-sm">Google Gemini AI</div>
                 <div className="text-xs text-green-600 font-medium">Active & Connected</div>
              </div>
           </div>
           <button 
             onClick={() => {
                if (window.confirm("Do you want to reset your API Key selection?")) {
                    window.location.reload(); 
                }
             }} 
             className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1.5 rounded-md bg-white hover:bg-gray-50 transition-colors"
           >
             Change Key
           </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
           <div className="flex items-center gap-3">
              <div className="bg-[#06C755] p-2 rounded-lg shadow-sm">
                 <span className="text-white font-bold text-xs">L</span>
              </div>
              <div>
                 <div className="font-semibold text-gray-900 text-sm">LINE Messaging API</div>
                 {lineConfigured ? (
                   <div className="text-xs text-green-600 font-medium">
                     Channel ID: {getLineConfig()?.channelId ? `${getLineConfig()?.channelId.slice(0, 4)}***${getLineConfig()?.channelId.slice(-3)}` : 'Configured'}
                   </div>
                 ) : (
                   <div className="text-xs text-yellow-600 font-medium">Not Configured</div>
                 )}
              </div>
           </div>
           <button 
             onClick={() => setIsLineConfigModalOpen(true)}
             className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1.5 rounded-md bg-white hover:bg-gray-50 transition-colors"
           >
             Configure
           </button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-lg font-medium shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0">
           Save Changes
        </button>
      </div>
    </div>
  );

  const renderCampaignCreator = () => (
    <div className="flex flex-col h-full lg:flex-row overflow-hidden">
      {/* Left: Input & Controls */}
      <div className="w-full lg:w-1/2 p-8 overflow-y-auto border-r border-gray-200 bg-white">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">New Broadcast</h2>
        <p className="text-gray-500 mb-8 text-sm">Create one message, let AI personalize it for your filtered audience.</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
          <input type="text" defaultValue="New Product Launch - Nov" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Base Message (Generic)
          </label>
          <div className="relative">
            <textarea
              className="w-full p-4 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all resize-none text-gray-700"
              value={baseMessage}
              onChange={(e) => setBaseMessage(e.target.value)}
              placeholder="Enter your main message here..."
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              {baseMessage.length} chars
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200 mb-8">
          <div>
            <div className="text-sm font-bold text-gray-800">Target Audience</div>
            <div className="text-xs text-gray-500">
              {filteredContacts.length === contacts.length 
                ? `All Contacts (${contacts.length} users)` 
                : <span className="text-green-600 font-medium">Filtered Segment ({filteredContacts.length} users)</span>
              }
            </div>
          </div>
          <button 
            onClick={() => setIsFilterModalOpen(true)}
            className="text-green-600 text-sm font-medium hover:underline flex items-center"
          >
            <Filter className="w-4 h-4 mr-1"/>
            Edit Filter
          </button>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !baseMessage || filteredContacts.length === 0}
          className={`w-full py-3 px-6 rounded-lg flex items-center justify-center space-x-2 font-semibold transition-all shadow-md
            ${(isGenerating || filteredContacts.length === 0) 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg transform hover:-translate-y-0.5'}`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin w-5 h-5" />
              <span>Personalizing for {filteredContacts.length} users...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              <span>Generate for {filteredContacts.length} Users</span>
            </>
          )}
        </button>
        
        {/* Results List */}
        {generatedMessages.length > 0 && (
            <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2"/>
                    Generated Drafts
                </h3>
                <div className="space-y-3">
                    {filteredContacts.map(contact => {
                        const msg = generatedMessages.find(m => m.contactId === contact.id);
                        const isSelected = selectedPreviewContactId === contact.id;
                        return (
                            <div 
                                key={contact.id} 
                                onClick={() => setSelectedPreviewContactId(contact.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-sm text-gray-900">{contact.name}</span>
                                    <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{contact.tier}</span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2">
                                    {msg?.customizedMessage || "Pending..."}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

      </div>

      {/* Right: Preview & Send */}
      <div className="w-full lg:w-1/2 bg-gray-100 p-8 flex flex-col items-center justify-center relative">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Device Preview</h3>
        
        {currentPreviewContact ? (
            <PhonePreview 
                message={currentPreviewMessage} 
                recipientName={currentPreviewContact.name} 
                avatarUrl={currentPreviewContact.avatarUrl}
            />
        ) : (
            <div className="h-[600px] w-[300px] flex items-center justify-center text-gray-400">
                No contacts selected
            </div>
        )}

        <div className="mt-8 w-full max-w-sm space-y-3">
             {/* Broadcast button - sends base message to ALL followers */}
             {!sendSuccess && (
               <button
                  onClick={handleBroadcast}
                  disabled={isBroadcasting || !baseMessage.trim()}
                  className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {isBroadcasting ? <Loader2 className="animate-spin" /> : <Radio className="w-5 h-5" />}
                  <span>📢 Broadcast to ALL Followers</span>
               </button>
             )}

             {/* Personalized send button - needs generated messages */}
             {generatedMessages.length > 0 && !sendSuccess && (
                 <button
                    onClick={handleSend}
                    disabled={isSending}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-xl shadow flex items-center justify-center space-x-2 transition-transform active:scale-95 text-sm"
                 >
                    {isSending ? <Loader2 className="animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Send Personalized ({filteredContacts.length} users)</span>
                 </button>
             )}
             
             {!generatedMessages.length && !sendSuccess && (
               <p className="text-xs text-center text-gray-400">
                 💡 Broadcast sends base message to all followers.<br/>
                 Generate AI messages for personalized sending.
               </p>
             )}
             
             {sendSuccess && (
                 <div className="w-full bg-green-100 text-green-800 border border-green-200 p-4 rounded-xl text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white mb-2 shadow-sm">
                        <CheckCircle2 className="w-8 h-8" />
                     </div>
                     <div className="font-bold text-lg">Sent Successfully!</div>
                     <div className="text-sm opacity-80">Your message has been broadcasted to all followers.</div>
                 </div>
             )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      <ApiKeyModal onKeySet={() => window.location.reload()} />
      {renderFilterModal()}
      <LineConfigModal 
        isOpen={isLineConfigModalOpen}
        onClose={() => setIsLineConfigModalOpen(false)}
        onSave={(config) => {
          setLineConfigured(true);
        }}
      />

      {/* Add Contact Modal */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all scale-100">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <UserPlus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Add Contact</h3>
                  <p className="text-xs text-gray-500">Add a LINE user to send personalized messages</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddContactModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., John Doe"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  LINE User ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newContact.lineUserId}
                  onChange={(e) => setNewContact(prev => ({ ...prev, lineUserId: e.target.value }))}
                  placeholder="e.g., U1234567890abcdef..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get User ID from webhook when user messages your bot
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tier</label>
                <select
                  value={newContact.tier}
                  onChange={(e) => setNewContact(prev => ({ ...prev, tier: e.target.value as 'Gold' | 'Silver' | 'Bronze' }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm bg-white"
                >
                  <option value="Gold">Gold</option>
                  <option value="Silver">Silver</option>
                  <option value="Bronze">Bronze</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Interests</label>
                <input
                  type="text"
                  value={newContact.interests}
                  onChange={(e) => setNewContact(prev => ({ ...prev, interests: e.target.value }))}
                  placeholder="e.g., Technology, Fashion, Travel"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate multiple interests with commas
                </p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t border-gray-100">
              <button
                onClick={() => setIsAddContactModalOpen(false)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContact}
                disabled={!newContact.name.trim() || !newContact.lineUserId.trim()}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar Navigation */}
      <aside className="w-20 md:w-64 bg-[#1D212F] text-white flex flex-col flex-shrink-0 transition-all duration-300">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-gray-700">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center font-bold text-xl mr-0 md:mr-3">L</div>
          <span className="hidden md:block font-bold text-lg tracking-tight">LineManager</span>
        </div>

        <nav className="flex-1 py-6 space-y-2 px-2">
          <button 
            onClick={() => setCurrentView(View.DASHBOARD)}
            className={`w-full flex items-center justify-center md:justify-start p-3 rounded-lg transition-colors ${currentView === View.DASHBOARD ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5 md:mr-3" />
            <span className="hidden md:block">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setCurrentView(View.CONTACTS)}
            className={`w-full flex items-center justify-center md:justify-start p-3 rounded-lg transition-colors ${currentView === View.CONTACTS ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <Users className="w-5 h-5 md:mr-3" />
            <span className="hidden md:block">Contacts</span>
          </button>

          <button 
            onClick={() => setCurrentView(View.CAMPAIGN_NEW)}
            className={`w-full flex items-center justify-center md:justify-start p-3 rounded-lg transition-colors ${currentView === View.CAMPAIGN_NEW ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <MessageSquare className="w-5 h-5 md:mr-3" />
            <span className="hidden md:block">Broadcasts</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button 
            onClick={() => setCurrentView(View.SETTINGS)}
            className={`flex items-center justify-center md:justify-start w-full transition-colors rounded-lg p-2 ${currentView === View.SETTINGS ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <Settings className="w-5 h-5 md:mr-3" />
            <span className="hidden md:block">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-bold text-gray-800">
            {currentView === View.DASHBOARD && 'Dashboard'}
            {currentView === View.CONTACTS && 'Contact Management'}
            {currentView === View.CAMPAIGN_NEW && 'Campaign Manager'}
            {currentView === View.SETTINGS && 'Settings'}
          </h1>
          <div className="flex items-center space-x-4">
             {lineConfigured && botInfo ? (
               <div className="flex items-center space-x-2 text-sm text-gray-600">
                 <div className="w-2 h-2 rounded-full bg-green-500"></div>
                 <span>Connected to {botInfo.displayName}</span>
               </div>
             ) : lineConfigured ? (
               <div className="flex items-center space-x-2 text-sm text-gray-600">
                 <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                 <span>LINE Configured</span>
               </div>
             ) : (
               <div className="flex items-center space-x-2 text-sm text-gray-400">
                 <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                 <span>LINE Not Connected</span>
               </div>
             )}
             <img src={botInfo?.pictureUrl || "https://picsum.photos/seed/admin/40"} alt="Admin" className="w-9 h-9 rounded-full border border-gray-200" />
          </div>
        </header>
        
        <div className="flex-1 overflow-auto bg-[#F8FAFC]">
          {currentView === View.DASHBOARD && renderDashboard()}
          {currentView === View.CONTACTS && renderContacts()}
          {currentView === View.CAMPAIGN_NEW && renderCampaignCreator()}
          {currentView === View.SETTINGS && renderSettings()}
        </div>
      </main>
    </div>
  );
};

export default App;