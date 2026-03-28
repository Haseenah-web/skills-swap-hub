import React from 'react';

const Dashboard = ({ user }) => {
  return (
    <div style={styles.container}>
      <div style={styles.welcomeCard}>
        <h1>Welcome back, {user?.name || 'User'}! 👋</h1>
        <p>Your skill exchange journey starts here</p>
        <div style={styles.stats}>
          <div style={styles.statCard}>
            <h3>0</h3>
            <p>Skills Offered</p>
          </div>
          <div style={styles.statCard}>
            <h3>0</h3>
            <p>Skills Learned</p>
          </div>
          <div style={styles.statCard}>
            <h3>0</h3>
            <p>Swaps Completed</p>
          </div>
          <div style={styles.statCard}>
            <h3>5.0</h3>
            <p>Rating</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    padding: '2rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  welcomeCard: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '2rem',
    padding: '3rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '2rem',
    marginTop: '3rem',
  },
  statCard: {
    textAlign: 'center',
    padding: '2rem',
    background: '#f8fafc',
    borderRadius: '1rem',
    transition: 'transform 0.3s',
  },
};

export default Dashboard;