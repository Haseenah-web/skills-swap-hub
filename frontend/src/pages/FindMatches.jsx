import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const FindMatches = () => {
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [skills, setSkills] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchFilters, setMatchFilters] = useState({
    skillId: '',
    city: '',
    level: '',
  });
  const [selectedReviewUserId, setSelectedReviewUserId] = useState(null);
  const [reviewPanel, setReviewPanel] = useState({
    isLoading: false,
    userName: '',
    averageRating: null,
    reviewCount: 0,
    reviews: [],
  });

  const navigate = useNavigate();
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

  const fetchSkills = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/skills`);
      setSkills(response.data?.skills || []);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to load skills';
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

  useEffect(() => {
    fetchSkills();
    fetchMatches();
  }, [fetchMatches, fetchSkills]);

  const loadReviews = async (userId) => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      return;
    }

    setSelectedReviewUserId(userId);
    setReviewPanel((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/reviews/user/${userId}`, authConfig);
      setReviewPanel({
        isLoading: false,
        userName: response.data?.user?.name || 'User',
        averageRating: response.data?.averageRating ?? null,
        reviewCount: response.data?.reviewCount || 0,
        reviews: response.data?.reviews || [],
      });
    } catch (error) {
      setReviewPanel((prev) => ({ ...prev, isLoading: false }));
      const errorMessage = error.response?.data?.message || 'Unable to load reviews';
      toast.error(errorMessage);
    }
  };

  const handleFavouriteToggle = async (match) => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      toast.error('Please login again');
      return;
    }

    try {
      if (match.isFavourite) {
        await axios.delete(`${API_BASE_URL}/api/favourites/${match.id}`, authConfig);
      } else {
        await axios.post(`${API_BASE_URL}/api/favourites`, { userId: match.id }, authConfig);
      }

      setMatches((prev) => prev.map((item) => (
        item.id === match.id
          ? { ...item, isFavourite: !item.isFavourite }
          : item
      )));
      toast.success(match.isFavourite ? 'Removed from favourites' : 'Added to favourites');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to update favourite';
      toast.error(errorMessage);
    }
  };

  const handleMatchFilterChange = (e) => {
    const { name, value } = e.target;
    setMatchFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchMatches = async () => {
    await fetchMatches(matchFilters);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Find Match</h1>
        <p style={styles.subtitle}>Compare skills, reputation, and availability before you connect.</p>

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

        <div style={styles.layout}>
          <div style={styles.matchList}>
            {matches.length === 0 ? (
              <p style={styles.emptyText}>No matches found for current filters.</p>
            ) : (
              matches.map((match) => (
                <div key={match.id} style={styles.matchCard}>
                  <div style={styles.matchHeader}>
                    <div>
                      <h3 style={styles.matchName}>{match.name}</h3>
                      <p style={styles.matchMeta}>{match.city || 'City not set'}</p>
                    </div>
                    <div style={styles.reputationBlock}>
                      <span style={styles.ratingBadge}>
                        {match.averageRating ? `${match.averageRating}/5` : 'No ratings'}
                      </span>
                      <span style={styles.reviewCount}>{match.reviewCount || 0} reviews</span>
                    </div>
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

                  <div style={styles.actionRow}>
                    <button type="button" style={styles.primaryButton} onClick={() => navigate(`/messages?userId=${match.id}`)}>
                      Message
                    </button>
                    <button type="button" style={styles.secondaryButton} onClick={() => handleFavouriteToggle(match)}>
                      {match.isFavourite ? 'Remove Favourite' : 'Add Favourite'}
                    </button>
                    <button type="button" style={styles.ghostButton} onClick={() => loadReviews(match.id)}>
                      {selectedReviewUserId === match.id ? 'Refresh Reviews' : 'View Reviews'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <aside style={styles.reviewPanel}>
            <h2 style={styles.reviewPanelTitle}>Reviews</h2>
            {selectedReviewUserId === null ? (
              <p style={styles.emptyText}>Select a match to inspect ratings and feedback.</p>
            ) : reviewPanel.isLoading ? (
              <p style={styles.emptyText}>Loading reviews...</p>
            ) : (
              <>
                <p style={styles.reviewPanelMeta}>
                  {reviewPanel.userName} • {reviewPanel.averageRating ? `${reviewPanel.averageRating}/5` : 'No ratings yet'} • {reviewPanel.reviewCount} reviews
                </p>
                {reviewPanel.reviews.length === 0 ? (
                  <p style={styles.emptyText}>No written reviews yet.</p>
                ) : (
                  <div style={styles.reviewList}>
                    {reviewPanel.reviews.map((review) => (
                      <article key={review.id} style={styles.reviewCard}>
                        <div style={styles.reviewHeader}>
                          <strong>{review.reviewerName}</strong>
                          <span style={styles.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                        </div>
                        {review.comment && <p style={styles.reviewComment}>{review.comment}</p>}
                        <p style={styles.reviewDate}>{new Date(review.createdAt).toLocaleString()}</p>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: 'calc(100vh - 76px)',
    padding: '2rem',
    background: 'linear-gradient(140deg, #eff6ff 0%, #dbeafe 45%, #f8fafc 100%)',
  },
  card: {
    maxWidth: '1220px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '1.25rem',
    border: '1px solid #dbeafe',
    boxShadow: '0 20px 45px rgba(30, 64, 175, 0.15)',
    padding: '2rem',
  },
  title: {
    color: '#1e3a8a',
    marginBottom: '0.35rem',
  },
  subtitle: {
    color: '#1d4ed8',
    marginBottom: '1.5rem',
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
  layout: {
    display: 'grid',
    gridTemplateColumns: '1.7fr 1fr',
    gap: '1rem',
    alignItems: 'start',
  },
  matchList: {
    display: 'grid',
    gap: '0.85rem',
  },
  matchCard: {
    border: '1px solid #cbd5e1',
    borderRadius: '0.85rem',
    background: '#f8fafc',
    padding: '1rem',
  },
  matchHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.75rem',
    marginBottom: '0.35rem',
  },
  matchName: {
    margin: 0,
    color: '#0f172a',
  },
  matchMeta: {
    margin: '0.2rem 0 0',
    color: '#475569',
    fontSize: '0.9rem',
  },
  reputationBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem',
  },
  ratingBadge: {
    background: '#dbeafe',
    color: '#1e3a8a',
    fontWeight: 700,
    padding: '0.35rem 0.7rem',
    borderRadius: '999px',
  },
  reviewCount: {
    color: '#475569',
    fontSize: '0.84rem',
  },
  matchBio: {
    color: '#334155',
    fontSize: '0.92rem',
    marginBottom: '0.6rem',
    lineHeight: 1.5,
  },
  matchSkillLists: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.8rem',
    marginBottom: '0.8rem',
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
  actionRow: {
    display: 'flex',
    gap: '0.65rem',
    flexWrap: 'wrap',
  },
  primaryButton: {
    border: 'none',
    borderRadius: '0.75rem',
    background: '#1d4ed8',
    color: '#fff',
    fontWeight: 700,
    padding: '0.7rem 0.95rem',
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid #2563eb',
    borderRadius: '0.75rem',
    background: '#fff',
    color: '#1d4ed8',
    fontWeight: 700,
    padding: '0.7rem 0.95rem',
    cursor: 'pointer',
  },
  ghostButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '0.75rem',
    background: '#f8fafc',
    color: '#334155',
    fontWeight: 700,
    padding: '0.7rem 0.95rem',
    cursor: 'pointer',
  },
  reviewPanel: {
    border: '1px solid #cbd5e1',
    borderRadius: '1rem',
    background: '#f8fafc',
    padding: '1rem',
    position: 'sticky',
    top: '96px',
  },
  reviewPanelTitle: {
    marginTop: 0,
    color: '#1e3a8a',
  },
  reviewPanelMeta: {
    color: '#334155',
    lineHeight: 1.5,
  },
  reviewList: {
    display: 'grid',
    gap: '0.75rem',
  },
  reviewCard: {
    border: '1px solid #dbeafe',
    background: '#fff',
    borderRadius: '0.85rem',
    padding: '0.85rem',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
    alignItems: 'center',
  },
  reviewStars: {
    color: '#f59e0b',
    fontWeight: 700,
  },
  reviewComment: {
    color: '#334155',
    lineHeight: 1.55,
    marginBottom: '0.35rem',
  },
  reviewDate: {
    color: '#64748b',
    fontSize: '0.84rem',
    margin: 0,
  },
  emptyText: {
    color: '#64748b',
    fontSize: '0.95rem',
  },
};

export default FindMatches;
