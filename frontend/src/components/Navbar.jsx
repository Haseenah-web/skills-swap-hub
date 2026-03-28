import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';

const Navbar = ({ isAuthenticated, user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const scrollToSection = (sectionId) => {
    setIsMenuOpen(false);

    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: sectionId } });
      return;
    }

    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    const offsetTop = section.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: offsetTop, behavior: 'smooth' });
  };

  return (
    <nav style={styles.navbar}>
      <div className="container" style={styles.container}>
        <Link to="/" style={styles.logo}>
          <span style={styles.logoIcon}>⚡</span>
          <span style={styles.logoText}>SkillSwap</span>
        </Link>

        {/* Desktop Menu */}
        <div style={styles.desktopMenu}>
          {!isAuthenticated && (
            <>
              <Link to="/" style={styles.navLink}>Home</Link>
              <button type="button" style={styles.sectionBtn} onClick={() => scrollToSection('about')}>About</button>
              <button type="button" style={styles.sectionBtn} onClick={() => scrollToSection('developers')}>Team</button>
              <button type="button" style={styles.sectionBtn} onClick={() => scrollToSection('reviews')}>Reviews</button>
              <button type="button" style={styles.sectionBtn} onClick={() => scrollToSection('contact')}>Contact</button>
            </>
          )}
          
          {isAuthenticated ? (
            <div style={styles.userSection}>
              <Link to="/dashboard" style={styles.navLink}>
                <FaUser /> Dashboard
              </Link>
              <Link to="/dashboard" style={styles.navLink}>Profile</Link>
              <button onClick={handleLogout} style={styles.logoutBtn}>
                <FaSignOutAlt /> Logout
              </button>
            </div>
          ) : (
            <div style={styles.authButtons}>
              <Link to="/login" style={styles.loginBtn}>Login</Link>
              <Link to="/register" style={styles.registerBtn}>Sign Up</Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          style={styles.menuBtn} 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div style={styles.mobileMenu}>
            {!isAuthenticated && (
              <>
                <Link to="/" style={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>Home</Link>
                <button type="button" style={styles.mobileSectionBtn} onClick={() => scrollToSection('about')}>About</button>
                <button type="button" style={styles.mobileSectionBtn} onClick={() => scrollToSection('developers')}>Team</button>
                <button type="button" style={styles.mobileSectionBtn} onClick={() => scrollToSection('reviews')}>Reviews</button>
                <button type="button" style={styles.mobileSectionBtn} onClick={() => scrollToSection('contact')}>Contact</button>
              </>
            )}
            
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" style={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
                <Link to="/dashboard" style={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>Profile</Link>
                <button onClick={handleLogout} style={styles.mobileLogoutBtn}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" style={styles.mobileNavLink} onClick={() => setIsMenuOpen(false)}>Login</Link>
                <Link to="/register" style={styles.mobileRegisterBtn} onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  logoIcon: {
    fontSize: '1.8rem',
  },
  logoText: {
    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
  },
  desktopMenu: {
    display: 'flex',
    gap: '2rem',
    alignItems: 'center',
  },
  navLink: {
    textDecoration: 'none',
    color: '#334155',
    fontWeight: '500',
    transition: 'color 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  sectionBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    textDecoration: 'none',
    color: '#334155',
    fontWeight: '500',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  userSection: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    transition: 'all 0.3s',
  },
  authButtons: {
    display: 'flex',
    gap: '1rem',
  },
  loginBtn: {
    textDecoration: 'none',
    padding: '0.5rem 1.25rem',
    borderRadius: '8px',
    color: '#2563eb',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  registerBtn: {
    textDecoration: 'none',
    padding: '0.5rem 1.25rem',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
    color: 'white',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
  menuBtn: {
    display: 'none',
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#2563eb',
  },
  mobileMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
  },
  mobileNavLink: {
    textDecoration: 'none',
    color: '#334155',
    padding: '0.75rem',
    borderRadius: '8px',
    transition: 'all 0.3s',
  },
  mobileSectionBtn: {
    background: 'none',
    border: 'none',
    textAlign: 'left',
    color: '#334155',
    padding: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  mobileRegisterBtn: {
    textDecoration: 'none',
    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
    color: 'white',
    padding: '0.75rem',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: '600',
  },
  mobileLogoutBtn: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};

// Responsive styles
const mediaQuery = '@media (max-width: 768px)';
Object.assign(styles, {
  [mediaQuery]: {
    desktopMenu: {
      display: 'none',
    },
    menuBtn: {
      display: 'block',
    },
  },
});

export default Navbar;
