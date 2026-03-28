import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = ({ user }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingSkills, setIsUpdatingSkills] = useState(false);
  const [skills, setSkills] = useState([]);
  const [offeredSkills, setOfferedSkills] = useState([]);
  const [wantedSkills, setWantedSkills] = useState([]);
  const [offeredDraft, setOfferedDraft] = useState({
    skillId: '',
    level: 'intermediate',
    note: '',
  });
  const [wantedDraft, setWantedDraft] = useState({
    skillId: '',
    level: 'beginner',
    note: '',
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

  const loadDashboardData = useCallback(async () => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      setIsLoading(false);
      return;
    }

    try {
      const [profileResponse, skillsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/users/me`, authConfig),
        axios.get(`${API_BASE_URL}/api/skills`),
      ]);

      const profile = profileResponse.data?.user || {};
      setOfferedSkills(profile.offeredSkills || []);
      setWantedSkills(profile.wantedSkills || []);
      setSkills(skillsResponse.data?.skills || []);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to load dashboard skills';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleOfferedDraftChange = (e) => {
    const { name, value } = e.target;
    setOfferedDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleWantedDraftChange = (e) => {
    const { name, value } = e.target;
    setWantedDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = async (type) => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      toast.error('Please login again');
      return;
    }

    const draft = type === 'offered' ? offeredDraft : wantedDraft;
    const skillId = Number(draft.skillId);
    if (!skillId) {
      toast.error('Please select a skill');
      return;
    }

    setIsUpdatingSkills(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/users/me/skills/${type}`,
        {
          skillId,
          level: draft.level,
          note: draft.note,
        },
        authConfig
      );

      if (type === 'offered') {
        setOfferedDraft({ skillId: '', level: 'intermediate', note: '' });
      } else {
        setWantedDraft({ skillId: '', level: 'beginner', note: '' });
      }

      await loadDashboardData();
      toast.success(type === 'offered' ? 'Added to I can teach' : 'Added to I want to learn');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to add skill';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingSkills(false);
    }
  };

  const handleDeleteSkill = async (type, skillId) => {
    const authConfig = getAuthConfig();
    if (!authConfig) {
      toast.error('Please login again');
      return;
    }

    setIsUpdatingSkills(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/users/me/skills/${type}/${skillId}`, authConfig);
      await loadDashboardData();
      toast.success(type === 'offered' ? 'Removed from I can teach' : 'Removed from I want to learn');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Unable to remove skill';
      toast.error(errorMessage);
    } finally {
      setIsUpdatingSkills(false);
    }
  };

  const offeredSkillIds = new Set(offeredSkills.map((item) => item.skillId));
  const wantedSkillIds = new Set(wantedSkills.map((item) => item.skillId));
  const offeredSkillOptions = skills.filter((skill) => !offeredSkillIds.has(skill.id));
  const wantedSkillOptions = skills.filter((skill) => !wantedSkillIds.has(skill.id));

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome back, {user?.name || 'User'}</h1>
        <p style={styles.subtitle}>Track your progress and manage your skill mappings here.</p>

        {isLoading && <p style={styles.loadingText}>Loading dashboard data...</p>}

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <h3>{offeredSkills.length}</h3>
            <p>Skills Offered</p>
          </div>
          <div style={styles.statCard}>
            <h3>{wantedSkills.length}</h3>
            <p>Skills Wanted</p>
          </div>
          <div style={styles.statCard}>
            <h3>0</h3>
            <p>Active Swaps</p>
          </div>
          <div style={styles.statCard}>
            <h3>0</h3>
            <p>Completed</p>
          </div>
        </div>

        <div style={styles.skillsGrid}>
          <section style={styles.skillCard}>
            <h2 style={styles.skillTitle}>I Can Teach</h2>

            <div style={styles.skillForm}>
              <select name="skillId" value={offeredDraft.skillId} onChange={handleOfferedDraftChange} style={styles.input}>
                <option value="">Select skill</option>
                {offeredSkillOptions.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}{skill.category ? ` (${skill.category})` : ''}
                  </option>
                ))}
              </select>

              <select name="level" value={offeredDraft.level} onChange={handleOfferedDraftChange} style={styles.input}>
                {skillLevelOptions.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>

              <input
                type="text"
                name="note"
                value={offeredDraft.note}
                onChange={handleOfferedDraftChange}
                placeholder="Optional note"
                style={styles.input}
              />

              <button
                type="button"
                style={styles.addButton}
                disabled={isUpdatingSkills}
                onClick={() => handleAddSkill('offered')}
              >
                Add Skill
              </button>
            </div>

            <div style={styles.skillList}>
              {offeredSkills.length === 0 ? (
                <p style={styles.emptyText}>No skills added yet.</p>
              ) : (
                offeredSkills.map((item) => (
                  <div key={`offered-${item.skillId}`} style={styles.skillItem}>
                    <div>
                      <strong>{item.name}</strong>
                      <p style={styles.skillItemMeta}>{item.level}{item.note ? ` • ${item.note}` : ''}</p>
                    </div>
                    <button
                      type="button"
                      style={styles.removeButton}
                      disabled={isUpdatingSkills}
                      onClick={() => handleDeleteSkill('offered', item.skillId)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section style={styles.skillCard}>
            <h2 style={styles.skillTitle}>I Want to Learn</h2>

            <div style={styles.skillForm}>
              <select name="skillId" value={wantedDraft.skillId} onChange={handleWantedDraftChange} style={styles.input}>
                <option value="">Select skill</option>
                {wantedSkillOptions.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}{skill.category ? ` (${skill.category})` : ''}
                  </option>
                ))}
              </select>

              <select name="level" value={wantedDraft.level} onChange={handleWantedDraftChange} style={styles.input}>
                {skillLevelOptions.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>

              <input
                type="text"
                name="note"
                value={wantedDraft.note}
                onChange={handleWantedDraftChange}
                placeholder="Optional note"
                style={styles.input}
              />

              <button
                type="button"
                style={styles.addButton}
                disabled={isUpdatingSkills}
                onClick={() => handleAddSkill('wanted')}
              >
                Add Skill
              </button>
            </div>

            <div style={styles.skillList}>
              {wantedSkills.length === 0 ? (
                <p style={styles.emptyText}>No skills added yet.</p>
              ) : (
                wantedSkills.map((item) => (
                  <div key={`wanted-${item.skillId}`} style={styles.skillItem}>
                    <div>
                      <strong>{item.name}</strong>
                      <p style={styles.skillItemMeta}>{item.level}{item.note ? ` • ${item.note}` : ''}</p>
                    </div>
                    <button
                      type="button"
                      style={styles.removeButton}
                      disabled={isUpdatingSkills}
                      onClick={() => handleDeleteSkill('wanted', item.skillId)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
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
    maxWidth: '980px',
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
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '0.9rem',
    textAlign: 'center',
    padding: '1rem',
  },
  loadingText: {
    color: '#475569',
    marginBottom: '1rem',
  },
  skillsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  skillCard: {
    border: '1px solid #dbeafe',
    borderRadius: '1rem',
    background: '#f8fafc',
    padding: '1rem',
  },
  skillTitle: {
    color: '#1e3a8a',
    fontSize: '1.1rem',
    marginBottom: '0.75rem',
  },
  skillForm: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.6rem',
    marginBottom: '0.75rem',
  },
  input: {
    width: '100%',
    border: '1px solid #bfdbfe',
    borderRadius: '0.7rem',
    padding: '0.65rem 0.75rem',
    fontSize: '0.95rem',
    background: '#ffffff',
  },
  addButton: {
    gridColumn: '1 / -1',
    border: 'none',
    borderRadius: '0.75rem',
    padding: '0.7rem 0.9rem',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    cursor: 'pointer',
  },
  skillList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
  },
  skillItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.65rem 0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '0.75rem',
    background: '#ffffff',
  },
  skillItemMeta: {
    margin: '0.2rem 0 0',
    color: '#475569',
    fontSize: '0.9rem',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '0.95rem',
  },
  removeButton: {
    border: 'none',
    borderRadius: '0.6rem',
    padding: '0.4rem 0.65rem',
    color: '#fff',
    background: '#ef4444',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
};

export default Dashboard;
