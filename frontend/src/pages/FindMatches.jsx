import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
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
            matches.map((match) => (
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
              </div>
            ))
          )}
        </div>
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
  emptyText: {
    color: '#64748b',
    fontSize: '0.95rem',
  },
};

export default FindMatches;
