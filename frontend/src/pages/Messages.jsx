import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const Messages = ({ user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingFavourite, setIsUpdatingFavourite] = useState(false);

  const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3003').replace(/\/$/, '');
  const initialQueryUserId = useMemo(() => searchParams.get('userId') || '', [searchParams]);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const loadConversations = useCallback(async () => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      setIsLoadingConversations(false);
      return;
    }

    setIsLoadingConversations(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/messages/conversations`, authConfig);
      const nextConversations = response.data?.conversations || [];
      setConversations(nextConversations);

      if (!selectedUserId && nextConversations.length > 0 && !initialQueryUserId) {
        setSelectedUserId(String(nextConversations[0].userId));
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to load conversations';
      toast.error(errorMessage);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [API_BASE_URL, initialQueryUserId, selectedUserId]);

  const loadMessages = useCallback(async (userIdToLoad) => {
    const authConfig = getAuthConfig();
    if (!authConfig || !userIdToLoad) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/messages/${userIdToLoad}`, authConfig);
      setSelectedConversation(response.data?.otherUser || null);
      setMessages(response.data?.messages || []);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to load messages';
      toast.error(errorMessage);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (initialQueryUserId) {
      setSelectedUserId(initialQueryUserId);
    }
  }, [initialQueryUserId]);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }
    loadMessages(selectedUserId);
    setSearchParams({ userId: selectedUserId });
  }, [loadMessages, selectedUserId, setSearchParams]);

  const handleSelectConversation = (userIdToSelect) => {
    setSelectedUserId(String(userIdToSelect));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const authConfig = getAuthConfig();
    if (!authConfig) {
      toast.error('Please login again');
      return;
    }

    const content = draft.trim();
    if (!selectedUserId || !content) {
      return;
    }

    setIsSending(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/messages`,
        {
          receiverId: Number(selectedUserId),
          content,
        },
        authConfig
      );
      setDraft('');
      await Promise.all([loadMessages(selectedUserId), loadConversations()]);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to send message';
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleFavourite = async () => {
    const authConfig = getAuthConfig();
    if (!authConfig || !selectedConversation) {
      toast.error('Please login again');
      return;
    }

    setIsUpdatingFavourite(true);
    try {
      if (selectedConversation.isFavourite) {
        await axios.delete(`${API_BASE_URL}/api/favourites/${selectedConversation.id}`, authConfig);
      } else {
        await axios.post(`${API_BASE_URL}/api/favourites`, { userId: selectedConversation.id }, authConfig);
      }

      const nextIsFavourite = !selectedConversation.isFavourite;
      setSelectedConversation((prev) => (prev ? { ...prev, isFavourite: nextIsFavourite } : prev));
      setConversations((prev) => prev.map((item) => (
        Number(item.userId) === Number(selectedConversation.id)
          ? { ...item, isFavourite: nextIsFavourite }
          : item
      )));
      toast.success(nextIsFavourite ? 'Added to favourites' : 'Removed from favourites');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to update favourite';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingFavourite(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <h1 style={styles.sidebarTitle}>Messages</h1>
            <p style={styles.sidebarSubtitle}>Conversations and quick check-ins.</p>
          </div>

          {isLoadingConversations ? (
            <p style={styles.sidebarEmpty}>Loading conversations...</p>
          ) : conversations.length === 0 && !initialQueryUserId ? (
            <p style={styles.sidebarEmpty}>No conversations yet. Start one from Find Match or Favorites.</p>
          ) : (
            <div style={styles.conversationList}>
              {conversations.map((conversation) => (
                <button
                  key={conversation.userId}
                  type="button"
                  style={{
                    ...styles.conversationItem,
                    ...(String(conversation.userId) === String(selectedUserId) ? styles.conversationItemActive : {}),
                  }}
                  onClick={() => handleSelectConversation(conversation.userId)}
                >
                  <div style={styles.conversationRow}>
                    <strong style={styles.conversationName}>{conversation.name}</strong>
                    {conversation.unreadCount > 0 && (
                      <span style={styles.unreadBadge}>{conversation.unreadCount}</span>
                    )}
                  </div>
                  <p style={styles.conversationMeta}>
                    {conversation.city || 'City not set'} • {conversation.averageRating ? `${conversation.averageRating}/5` : 'No ratings'}
                  </p>
                  <p style={styles.conversationPreview}>{conversation.latestMessage || 'Open to chat'}</p>
                </button>
              ))}

              {initialQueryUserId && conversations.length === 0 && (
                <button
                  type="button"
                  style={styles.conversationItemActive}
                  onClick={() => handleSelectConversation(initialQueryUserId)}
                >
                  <strong style={styles.conversationName}>Open conversation</strong>
                  <p style={styles.conversationPreview}>Start a new message thread.</p>
                </button>
              )}
            </div>
          )}
        </aside>

        <section style={styles.panel}>
          {selectedConversation ? (
            <>
              <div style={styles.panelHeader}>
                <div>
                  <h2 style={styles.panelTitle}>{selectedConversation.name}</h2>
                  <p style={styles.panelMeta}>
                    {selectedConversation.city || 'City not set'} • {selectedConversation.averageRating ? `${selectedConversation.averageRating}/5` : 'No ratings'} • {selectedConversation.reviewCount || 0} reviews
                  </p>
                </div>
                <button
                  type="button"
                  style={selectedConversation.isFavourite ? styles.favouriteButtonActive : styles.favouriteButton}
                  onClick={handleToggleFavourite}
                  disabled={isUpdatingFavourite}
                >
                  {isUpdatingFavourite
                    ? 'Saving...'
                    : (selectedConversation.isFavourite ? 'Remove Favourite' : 'Add Favourite')}
                </button>
              </div>

              <div style={styles.messageList}>
                {isLoadingMessages ? (
                  <p style={styles.panelEmpty}>Loading messages...</p>
                ) : messages.length === 0 ? (
                  <p style={styles.panelEmpty}>No messages yet. Start the conversation.</p>
                ) : (
                  messages.map((message) => {
                    const isOwn = Number(message.senderId) === Number(user?.id);
                    return (
                      <div
                        key={message.id}
                        style={{
                          ...styles.messageBubble,
                          ...(isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther),
                        }}
                      >
                        <p style={styles.messageText}>{message.content}</p>
                        <span style={styles.messageTime}>
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <form style={styles.composer} onSubmit={handleSendMessage}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type your message"
                  rows="3"
                  style={styles.textarea}
                />
                <button type="submit" style={styles.sendButton} disabled={isSending}>
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div style={styles.blankState}>
              <h2 style={styles.panelTitle}>Choose a conversation</h2>
              <p style={styles.panelEmpty}>Select someone from the left or open messages from a match card.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: 'calc(100vh - 76px)',
    padding: '1.5rem',
    background: 'linear-gradient(180deg, #ecfeff 0%, #cffafe 35%, #f8fafc 100%)',
  },
  shell: {
    maxWidth: '1250px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '1rem',
  },
  sidebar: {
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #a5f3fc',
    borderRadius: '1.4rem',
    boxShadow: '0 24px 48px rgba(8, 145, 178, 0.12)',
    padding: '1rem',
    minHeight: '70vh',
  },
  sidebarHeader: {
    marginBottom: '1rem',
  },
  sidebarTitle: {
    margin: 0,
    color: '#155e75',
  },
  sidebarSubtitle: {
    margin: '0.35rem 0 0',
    color: '#0f766e',
  },
  conversationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  conversationItem: {
    border: '1px solid #bae6fd',
    borderRadius: '1rem',
    background: '#ffffff',
    padding: '0.9rem',
    cursor: 'pointer',
    textAlign: 'left',
  },
  conversationItemActive: {
    border: '1px solid #0891b2',
    borderRadius: '1rem',
    background: '#ecfeff',
    padding: '0.9rem',
    cursor: 'pointer',
    textAlign: 'left',
  },
  conversationRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
    alignItems: 'center',
  },
  conversationName: {
    color: '#0f172a',
  },
  conversationMeta: {
    margin: '0.35rem 0',
    color: '#475569',
    fontSize: '0.9rem',
  },
  conversationPreview: {
    margin: 0,
    color: '#334155',
    fontSize: '0.92rem',
    lineHeight: 1.45,
  },
  unreadBadge: {
    background: '#0891b2',
    color: '#fff',
    borderRadius: '999px',
    minWidth: '1.6rem',
    height: '1.6rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 700,
  },
  panel: {
    background: 'rgba(255, 255, 255, 0.96)',
    border: '1px solid #a5f3fc',
    borderRadius: '1.4rem',
    boxShadow: '0 24px 48px rgba(8, 145, 178, 0.12)',
    minHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    padding: '1.25rem 1.25rem 1rem',
    borderBottom: '1px solid #cffafe',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  panelTitle: {
    margin: 0,
    color: '#164e63',
  },
  panelMeta: {
    margin: '0.35rem 0 0',
    color: '#475569',
  },
  favouriteButton: {
    border: '1px solid #0891b2',
    borderRadius: '999px',
    padding: '0.7rem 1rem',
    background: '#ffffff',
    color: '#0f766e',
    fontWeight: 700,
    cursor: 'pointer',
  },
  favouriteButtonActive: {
    border: '1px solid #0f766e',
    borderRadius: '999px',
    padding: '0.7rem 1rem',
    background: '#ccfbf1',
    color: '#115e59',
    fontWeight: 700,
    cursor: 'pointer',
  },
  messageList: {
    flex: 1,
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    overflowY: 'auto',
  },
  messageBubble: {
    maxWidth: '72%',
    borderRadius: '1rem',
    padding: '0.85rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  messageBubbleOwn: {
    alignSelf: 'flex-end',
    background: '#0f766e',
    color: '#fff',
  },
  messageBubbleOther: {
    alignSelf: 'flex-start',
    background: '#ecfeff',
    color: '#0f172a',
    border: '1px solid #a5f3fc',
  },
  messageText: {
    margin: 0,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
  messageTime: {
    fontSize: '0.78rem',
    opacity: 0.78,
  },
  composer: {
    padding: '1rem 1.25rem 1.25rem',
    borderTop: '1px solid #cffafe',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '0.75rem',
    alignItems: 'end',
  },
  textarea: {
    width: '100%',
    border: '1px solid #67e8f9',
    borderRadius: '1rem',
    padding: '0.9rem',
    fontSize: '0.95rem',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  sendButton: {
    border: 'none',
    borderRadius: '0.9rem',
    padding: '0.9rem 1.1rem',
    background: '#0891b2',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  blankState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    textAlign: 'center',
  },
  sidebarEmpty: {
    color: '#64748b',
    lineHeight: 1.5,
  },
  panelEmpty: {
    color: '#64748b',
    lineHeight: 1.5,
  },
};

export default Messages;
