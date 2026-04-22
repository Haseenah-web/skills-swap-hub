import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Favorites = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [favourites, setFavourites] = useState([]);
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

  const loadFavourites = useCallback(async () => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/favourites`, authConfig);
      setFavourites(response.data?.favourites || []);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to load favourites';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    loadFavourites();
  }, [loadFavourites]);

  const handleRemoveFavourite = async (userId) => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      toast.error('Please login again');
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/favourites/${userId}`, authConfig);
      setFavourites((prev) => prev.filter((item) => item.id !== userId));
      if (Number(selectedReviewUserId) === Number(userId)) {
        setSelectedReviewUserId(null);
        setReviewPanel({
          isLoading: false,
          userName: '',
          averageRating: null,
          reviewCount: 0,
          reviews: [],
        });
      }
      toast.success('Removed from favourites');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to remove favourite';
      toast.error(errorMessage);
    }
  };

  const openMessages = (userId) => {
    navigate(`/messages?userId=${userId}`);
  };

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

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Favorites</h1>
            <p style={styles.subtitle}>People you want to reconnect with quickly.</p>
          </div>
          <div style={styles.counter}>{favourites.length} saved</div>
        </div>

        {isLoading ? (
          <p style={styles.emptyText}>Loading favourites...</p>
        ) : favourites.length === 0 ? (
          <p style={styles.emptyText}>No favourites yet. Save people from Find Match.</p>
        ) : (
          <div style={styles.layout}>
            <div style={styles.grid}>
              {favourites.map((user) => (
                <article key={user.id} style={styles.userCard}>
                  <div style={styles.userTop}>
                    <div>
                      <h2 style={styles.userName}>{user.name}</h2>
                      <p style={styles.userMeta}>{user.city || 'City not set'}</p>
                    </div>
                    <div style={styles.ratingPill}>
                      {user.averageRating ? `${user.averageRating} / 5` : 'No ratings'}
                    </div>
                  </div>

                  <p style={styles.reviewMeta}>{user.reviewCount || 0} review{user.reviewCount === 1 ? '' : 's'}</p>
                  {user.bio && <p style={styles.bio}>{user.bio}</p>}

                  <div style={styles.actions}>
                    <button type="button" style={styles.primaryButton} onClick={() => openMessages(user.id)}>
                      Message
                    </button>
                    <button type="button" style={styles.ghostButton} onClick={() => loadReviews(user.id)}>
                      {selectedReviewUserId === user.id ? 'Refresh Reviews' : 'View Reviews'}
                    </button>
                    <button type="button" style={styles.secondaryButton} onClick={() => handleRemoveFavourite(user.id)}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <aside style={styles.reviewPanel}>
              <h2 style={styles.reviewPanelTitle}>Reviews</h2>
              {selectedReviewUserId === null ? (
                <p style={styles.emptyText}>Select a favourite to inspect ratings and written feedback.</p>
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
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: 'calc(100vh - 76px)',
    padding: '2rem',
    background: 'linear-gradient(160deg, #fef3c7 0%, #fde68a 35%, #f8fafc 100%)',
  },
  card: {
    maxWidth: '1100px',
    margin: '0 auto',
    background: 'rgba(255, 255, 255, 0.96)',
    border: '1px solid #fde68a',
    borderRadius: '1.5rem',
    boxShadow: '0 24px 50px rgba(146, 64, 14, 0.12)',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    color: '#92400e',
  },
  subtitle: {
    margin: '0.35rem 0 0',
    color: '#a16207',
  },
  counter: {
    background: '#78350f',
    color: '#fff',
    borderRadius: '999px',
    padding: '0.65rem 1rem',
    fontWeight: 700,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
    gap: '1rem',
    alignItems: 'start',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1rem',
  },
  userCard: {
    background: '#fffdf7',
    border: '1px solid #fcd34d',
    borderRadius: '1rem',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  userTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.8rem',
    alignItems: 'flex-start',
  },
  userName: {
    margin: 0,
    color: '#1f2937',
  },
  userMeta: {
    margin: '0.25rem 0 0',
    color: '#6b7280',
  },
  ratingPill: {
    background: '#fef3c7',
    color: '#92400e',
    borderRadius: '999px',
    padding: '0.35rem 0.7rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  reviewMeta: {
    margin: 0,
    color: '#92400e',
    fontSize: '0.92rem',
    fontWeight: 600,
  },
  bio: {
    margin: 0,
    color: '#374151',
    lineHeight: 1.55,
  },
  actions: {
    marginTop: 'auto',
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  primaryButton: {
    border: 'none',
    borderRadius: '0.8rem',
    padding: '0.75rem 1rem',
    background: '#b45309',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid #f59e0b',
    borderRadius: '0.8rem',
    padding: '0.75rem 1rem',
    background: '#fff',
    color: '#b45309',
    fontWeight: 700,
    cursor: 'pointer',
  },
  ghostButton: {
    border: '1px solid #d97706',
    borderRadius: '0.8rem',
    padding: '0.75rem 1rem',
    background: '#fffbeb',
    color: '#92400e',
    fontWeight: 700,
    cursor: 'pointer',
  },
  reviewPanel: {
    background: '#fffdf7',
    border: '1px solid #fcd34d',
    borderRadius: '1rem',
    padding: '1rem',
    position: 'sticky',
    top: '1rem',
  },
  reviewPanelTitle: {
    margin: '0 0 0.75rem',
    color: '#92400e',
  },
  reviewPanelMeta: {
    margin: '0 0 1rem',
    color: '#92400e',
    lineHeight: 1.5,
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  reviewCard: {
    border: '1px solid #fde68a',
    borderRadius: '0.9rem',
    padding: '0.85rem',
    background: '#ffffff',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
    alignItems: 'center',
    marginBottom: '0.4rem',
  },
  reviewStars: {
    color: '#d97706',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  reviewComment: {
    margin: '0 0 0.45rem',
    color: '#374151',
    lineHeight: 1.5,
  },
  reviewDate: {
    margin: 0,
    color: '#6b7280',
    fontSize: '0.85rem',
  },
  emptyText: {
    color: '#6b7280',
  },
};

export default Favorites;
