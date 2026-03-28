import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const SkillSwap = () => {
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingSwaps, setIsLoadingSwaps] = useState(false);
  const [isUpdatingSwapStatus, setIsUpdatingSwapStatus] = useState(false);
  const [isCreatingSwap, setIsCreatingSwap] = useState(false);
  const [skills, setSkills] = useState([]);
  const [offeredSkills, setOfferedSkills] = useState([]);
  const [matches, setMatches] = useState([]);
  const [incomingSwaps, setIncomingSwaps] = useState([]);
  const [outgoingSwaps, setOutgoingSwaps] = useState([]);
  const [swapDrafts, setSwapDrafts] = useState({});
  const [matchFilters, setMatchFilters] = useState({
    skillId: '',
    city: '',
    level: '',
  });

  const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:3003').replace(/\/$/, '');
  const skillLevelOptions = ['beginner', 'intermediate', 'advanced', 'expert'];

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

  const loadUserSkills = useCallback(async () => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      return;
    }

    try {
      const [profileResponse, skillsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/users/me`, authConfig),
        axios.get(`${API_BASE_URL}/api/skills`),
      ]);
      const profile = profileResponse.data?.user || {};
      setOfferedSkills(profile.offeredSkills || []);
      setSkills(skillsResponse.data?.skills || []);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to load swap setup';
      toast.error(errorMessage);
    }
  }, [API_BASE_URL]);

  const fetchMatches = useCallback(async (overrideFilters) => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      return;
    }

    const filters = overrideFilters || matchFilters;
    const params = {};
    if (filters.skillId) params.skillId = Number(filters.skillId);
    if (filters.city.trim()) params.city = filters.city.trim();
    if (filters.level) params.level = filters.level;

    setIsLoadingMatches(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/matches`, {
        ...authConfig,
        params,
      });
      setMatches(response.data?.matches || []);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to load matches';
      toast.error(errorMessage);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [API_BASE_URL, matchFilters]);

  const fetchSwaps = useCallback(async () => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      return;
    }

    setIsLoadingSwaps(true);
    try {
      const [incomingResponse, outgoingResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/swaps/incoming`, authConfig),
        axios.get(`${API_BASE_URL}/api/swaps/outgoing`, authConfig),
      ]);
      setIncomingSwaps(incomingResponse.data?.swaps || []);
      setOutgoingSwaps(outgoingResponse.data?.swaps || []);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to load swap requests';
      toast.error(errorMessage);
    } finally {
      setIsLoadingSwaps(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    loadUserSkills();
    fetchMatches();
    fetchSwaps();
  }, [fetchMatches, fetchSwaps, loadUserSkills]);

  const handleMatchFilterChange = (e) => {
    const { name, value } = e.target;
    setMatchFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchMatches = async () => {
    await fetchMatches(matchFilters);
  };

  const handleSwapDraftChange = (receiverId, field, value) => {
    setSwapDrafts((prev) => ({
      ...prev,
      [receiverId]: {
        offeredSkillId: '',
        requestedSkillId: '',
        message: '',
        ...prev[receiverId],
        [field]: value,
      },
    }));
  };

  const handleCreateSwap = async (receiverId) => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      toast.error('Please login again');
      return;
    }

    const draft = swapDrafts[receiverId] || {};
    if (!draft.offeredSkillId || !draft.requestedSkillId) {
      toast.error('Select both offered and requested skills');
      return;
    }

    setIsCreatingSwap(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/swaps`,
        {
          receiverId,
          offeredSkillId: Number(draft.offeredSkillId),
          requestedSkillId: Number(draft.requestedSkillId),
          message: draft.message || '',
        },
        authConfig
      );
      setSwapDrafts((prev) => ({ ...prev, [receiverId]: { offeredSkillId: '', requestedSkillId: '', message: '' } }));
      await fetchSwaps();
      toast.success('Swap request sent');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to create swap request';
      toast.error(errorMessage);
    } finally {
      setIsCreatingSwap(false);
    }
  };

  const handleUpdateSwapStatus = async (swapId, status) => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      toast.error('Please login again');
      return;
    }

    setIsUpdatingSwapStatus(true);
    try {
      await axios.patch(
        `${API_BASE_URL}/api/swaps/${swapId}/status`,
        { status },
        authConfig
      );
      await fetchSwaps();
      toast.success(`Swap ${status}`);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to update swap status';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingSwapStatus(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Skill Swap</h1>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Create Swap Request</h2>

          <div style={styles.filterGrid}>
            <select
              name="skillId"
              value={matchFilters.skillId}
              onChange={handleMatchFilterChange}
              style={styles.input}
            >
              <option value="">Any skill</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}{skill.category ? ` (${skill.category})` : ''}
                </option>
              ))}
            </select>

            <input
              type="text"
              name="city"
              value={matchFilters.city}
              onChange={handleMatchFilterChange}
              placeholder="Filter by city"
              style={styles.input}
            />

            <select
              name="level"
              value={matchFilters.level}
              onChange={handleMatchFilterChange}
              style={styles.input}
            >
              <option value="">Any level</option>
              {skillLevelOptions.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>

            <button
              type="button"
              style={styles.searchButton}
              onClick={handleSearchMatches}
              disabled={isLoadingMatches}
            >
              {isLoadingMatches ? 'Searching...' : 'Search Matches'}
            </button>
          </div>

          <div style={styles.matchList}>
            {matches.length === 0 ? (
              <p style={styles.emptyText}>No matches found for current filters.</p>
            ) : (
              matches.map((match) => {
                const draft = swapDrafts[match.id] || { offeredSkillId: '', requestedSkillId: '', message: '' };
                return (
                  <div key={match.id} style={styles.matchCard}>
                    <div style={styles.matchHeader}>
                      <h3 style={styles.matchName}>{match.name}</h3>
                      <p style={styles.matchMeta}>{match.city || 'City not set'}</p>
                    </div>
                    {match.bio && <p style={styles.matchBio}>{match.bio}</p>}

                    <div style={styles.matchSkillLists}>
                      <div>
                        <p style={styles.matchSkillTitle}>Offers</p>
                        {(match.offeredSkills || []).map((skill) => (
                          <p key={`offer-${match.id}-${skill.skillId}`} style={styles.matchSkillItem}>{skill.name} ({skill.level})</p>
                        ))}
                      </div>
                      <div>
                        <p style={styles.matchSkillTitle}>Wants</p>
                        {(match.wantedSkills || []).map((skill) => (
                          <p key={`want-${match.id}-${skill.skillId}`} style={styles.matchSkillItem}>{skill.name} ({skill.level})</p>
                        ))}
                      </div>
                    </div>

                    <div style={styles.swapDraftBox}>
                      <select
                        value={draft.offeredSkillId}
                        onChange={(e) => handleSwapDraftChange(match.id, 'offeredSkillId', e.target.value)}
                        style={styles.input}
                      >
                        <option value="">Your offered skill</option>
                        {offeredSkills.map((skill) => (
                          <option key={`my-offered-${skill.skillId}`} value={skill.skillId}>{skill.name}</option>
                        ))}
                      </select>

                      <select
                        value={draft.requestedSkillId}
                        onChange={(e) => handleSwapDraftChange(match.id, 'requestedSkillId', e.target.value)}
                        style={styles.input}
                      >
                        <option value="">Requested skill from user</option>
                        {(match.offeredSkills || []).map((skill) => (
                          <option key={`their-offered-${match.id}-${skill.skillId}`} value={skill.skillId}>{skill.name}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={draft.message}
                        onChange={(e) => handleSwapDraftChange(match.id, 'message', e.target.value)}
                        placeholder="Message (optional)"
                        style={styles.input}
                      />

                      <button
                        type="button"
                        style={styles.requestButton}
                        onClick={() => handleCreateSwap(match.id)}
                        disabled={isCreatingSwap}
                      >
                        {isCreatingSwap ? 'Sending...' : 'Send Swap Request'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Swap Requests</h2>
          {isLoadingSwaps && <p style={styles.loadingText}>Loading swaps...</p>}

          <div style={styles.swapColumns}>
            <div style={styles.swapColumn}>
              <h3 style={styles.swapColumnTitle}>Incoming</h3>
              {incomingSwaps.length === 0 ? (
                <p style={styles.emptyText}>No incoming requests.</p>
              ) : (
                incomingSwaps.map((swap) => (
                  <div key={`in-${swap.id}`} style={styles.swapCard}>
                    <p style={styles.swapCardTitle}>{swap.requesterName}</p>
                    <p style={styles.swapCardText}>Offers: {swap.offeredSkillName}</p>
                    <p style={styles.swapCardText}>Wants: {swap.requestedSkillName}</p>
                    <p style={styles.swapCardStatus}>Status: {swap.status}</p>
                    {swap.message && <p style={styles.swapCardText}>Message: {swap.message}</p>}
                    <div style={styles.swapActions}>
                      {swap.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            style={styles.acceptButton}
                            disabled={isUpdatingSwapStatus}
                            onClick={() => handleUpdateSwapStatus(swap.id, 'accepted')}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            style={styles.rejectButton}
                            disabled={isUpdatingSwapStatus}
                            onClick={() => handleUpdateSwapStatus(swap.id, 'rejected')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {swap.status === 'accepted' && (
                        <button
                          type="button"
                          style={styles.completeButton}
                          disabled={isUpdatingSwapStatus}
                          onClick={() => handleUpdateSwapStatus(swap.id, 'completed')}
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={styles.swapColumn}>
              <h3 style={styles.swapColumnTitle}>Outgoing</h3>
              {outgoingSwaps.length === 0 ? (
                <p style={styles.emptyText}>No outgoing requests.</p>
              ) : (
                outgoingSwaps.map((swap) => (
                  <div key={`out-${swap.id}`} style={styles.swapCard}>
                    <p style={styles.swapCardTitle}>{swap.receiverName}</p>
                    <p style={styles.swapCardText}>You offer: {swap.offeredSkillName}</p>
                    <p style={styles.swapCardText}>You request: {swap.requestedSkillName}</p>
                    <p style={styles.swapCardStatus}>Status: {swap.status}</p>
                    {swap.message && <p style={styles.swapCardText}>Message: {swap.message}</p>}
                    <div style={styles.swapActions}>
                      {swap.status === 'pending' && (
                        <button
                          type="button"
                          style={styles.cancelButton}
                          disabled={isUpdatingSwapStatus}
                          onClick={() => handleUpdateSwapStatus(swap.id, 'cancelled')}
                        >
                          Cancel
                        </button>
                      )}
                      {swap.status === 'accepted' && (
                        <button
                          type="button"
                          style={styles.completeButton}
                          disabled={isUpdatingSwapStatus}
                          onClick={() => handleUpdateSwapStatus(swap.id, 'completed')}
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: 'calc(100vh - 76px)',
    padding: '2rem',
    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  },
  card: {
    maxWidth: '1100px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '1.25rem',
    border: '1px solid #dbeafe',
    boxShadow: '0 20px 45px rgba(30, 64, 175, 0.15)',
    padding: '2rem',
  },
  title: {
    color: '#1e3a8a',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#1d4ed8',
    marginBottom: '1.75rem',
  },
  section: {
    paddingTop: '1.2rem',
  },
  sectionTitle: {
    color: '#1e3a8a',
    marginBottom: '0.85rem',
  },
  loadingText: {
    color: '#475569',
    marginBottom: '1rem',
  },
  input: {
    width: '100%',
    border: '1px solid #bfdbfe',
    borderRadius: '0.7rem',
    padding: '0.65rem 0.75rem',
    fontSize: '0.95rem',
    background: '#ffffff',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr',
    gap: '0.7rem',
    marginBottom: '1rem',
  },
  searchButton: {
    border: 'none',
    borderRadius: '0.7rem',
    background: '#1d4ed8',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  matchList: {
    display: 'grid',
    gap: '0.85rem',
  },
  matchCard: {
    border: '1px solid #cbd5e1',
    borderRadius: '0.85rem',
    background: '#f8fafc',
    padding: '0.9rem',
  },
  matchHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.35rem',
  },
  matchName: {
    margin: 0,
    color: '#0f172a',
  },
  matchMeta: {
    margin: 0,
    color: '#475569',
    fontSize: '0.9rem',
  },
  matchBio: {
    color: '#334155',
    fontSize: '0.92rem',
    marginBottom: '0.6rem',
  },
  matchSkillLists: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.8rem',
    marginBottom: '0.7rem',
  },
  matchSkillTitle: {
    fontWeight: 600,
    margin: '0 0 0.25rem',
    color: '#1e3a8a',
  },
  matchSkillItem: {
    margin: 0,
    color: '#334155',
    fontSize: '0.9rem',
  },
  swapDraftBox: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 2fr 1.5fr',
    gap: '0.6rem',
  },
  requestButton: {
    border: 'none',
    borderRadius: '0.7rem',
    background: '#059669',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  swapColumns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginTop: '2rem',
  },
  swapColumn: {
    border: '1px solid #dbeafe',
    borderRadius: '0.85rem',
    background: '#f8fafc',
    padding: '0.8rem',
  },
  swapColumnTitle: {
    marginTop: 0,
    marginBottom: '0.6rem',
    color: '#1e3a8a',
  },
  swapCard: {
    border: '1px solid #cbd5e1',
    borderRadius: '0.75rem',
    background: '#fff',
    padding: '0.65rem',
    marginBottom: '0.6rem',
  },
  swapCardTitle: {
    margin: '0 0 0.25rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  swapCardText: {
    margin: '0.1rem 0',
    fontSize: '0.9rem',
    color: '#334155',
  },
  swapCardStatus: {
    margin: '0.25rem 0',
    fontSize: '0.9rem',
    color: '#1d4ed8',
    fontWeight: 600,
  },
  swapActions: {
    display: 'flex',
    gap: '0.45rem',
    marginTop: '0.5rem',
  },
  acceptButton: {
    border: 'none',
    borderRadius: '0.55rem',
    padding: '0.35rem 0.65rem',
    background: '#16a34a',
    color: '#fff',
    cursor: 'pointer',
  },
  rejectButton: {
    border: 'none',
    borderRadius: '0.55rem',
    padding: '0.35rem 0.65rem',
    background: '#ef4444',
    color: '#fff',
    cursor: 'pointer',
  },
  cancelButton: {
    border: 'none',
    borderRadius: '0.55rem',
    padding: '0.35rem 0.65rem',
    background: '#f97316',
    color: '#fff',
    cursor: 'pointer',
  },
  completeButton: {
    border: 'none',
    borderRadius: '0.55rem',
    padding: '0.35rem 0.65rem',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '0.95rem',
  },
};

export default SkillSwap;
