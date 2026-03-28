import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/Home.css';

function Home() {
  const location = useLocation();

  useEffect(() => {
    const targetId = location.state?.scrollTo || location.hash?.replace('#', '');
    if (!targetId) {
      return;
    }

    const timer = window.setTimeout(() => {
      const section = document.getElementById(targetId);
      if (!section) {
        return;
      }
      const offsetTop = section.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [location]);

  const handleContactSubmit = (event) => {
    event.preventDefault();
    window.alert('📬 Thanks for reaching out! Our team will connect within 24h. Keep swapping skills!');
    event.currentTarget.reset();
  };

  const handleStartSwap = () => {
    window.alert('🚀 Skill Swap Hub demo - Sign-up / login coming soon. Start your skill journey!');
  };

  const handleExploreSkills = () => {
    const aboutSection = document.getElementById('about');
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <main className="home-page">
        <section id="home" className="hero">
          <div className="hero-bg-shape" />
          <div className="hero-bg-shape-2" />
          <div className="container hero-container">
            <div className="hero-content">
              <h1>
                Exchange skills,
                <br />
                not money.
              </h1>
              <p>
                Join a global community where your expertise becomes your currency. Learn,
                teach, and grow together - 100% free, 100% collaborative.
              </p>
              <div className="hero-buttons">
                <button className="btn-primary" type="button" onClick={handleStartSwap}>
                  Start swapping →
                </button>
                <button className="btn-secondary" type="button" onClick={handleExploreSkills}>
                  Explore skills
                </button>
              </div>
              <div className="hero-stats">
                <div className="stat-item">
                  <h3>1.2k+</h3>
                  <p>Active swappers</p>
                </div>
                <div className="stat-item">
                  <h3>340+</h3>
                  <p>Skills shared</p>
                </div>
                <div className="stat-item">
                  <h3>98%</h3>
                  <p>Satisfaction</p>
                </div>
              </div>
            </div>

            <div className="hero-card">
              <h3>🔥 Trending skills this week</h3>
              <div className="skill-badge-list">
                <span className="skill-badge">🎨 UI/UX Design</span>
                <span className="skill-badge">🐍 Python</span>
                <span className="skill-badge">🎸 Guitar</span>
                <span className="skill-badge">📊 Data Analysis</span>
                <span className="skill-badge">✍️ Creative Writing</span>
                <span className="skill-badge">🗣️ Spanish</span>
              </div>
              <p className="hero-card-note">
                ✨ Swap any skill - from coding to cooking. No money, just mutual growth.
              </p>
              <div className="trust-wrap">
                <span className="trust-pill">⭐ TrustScore 4.9/5</span>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="section">
          <div className="container">
            <h2 className="section-title">How Skill Swap Hub works</h2>
            <p className="section-subtitle">
              A new way to learn without limits - built on trust, transparency, and true
              collaboration.
            </p>

            <div className="features-grid">
              <article className="feature-card">
                <div className="feature-icon">🔄</div>
                <h3>1. List &amp; Discover</h3>
                <p>
                  Showcase what you can teach and what you&apos;d like to learn. Our smart match
                  system suggests ideal partners.
                </p>
              </article>
              <article className="feature-card">
                <div className="feature-icon">🤝</div>
                <h3>2. Agree &amp; Exchange</h3>
                <p>
                  Send swap requests, agree on sessions, and learn together. Zero money, pure
                  skill value.
                </p>
              </article>
              <article className="feature-card">
                <div className="feature-icon">⭐</div>
                <h3>3. Rate &amp; Build Trust</h3>
                <p>
                  After each swap, leave a review. Reputation scores build credibility - just
                  like Dellarocas[2] suggests.
                </p>
              </article>
            </div>

            <div className="cite-box">
              <h3>✨ "True collaborative consumption without financial barriers"</h3>
              <p>
                Inspired by Belk[3] and Hamari et al.[1] - because skills are meant to be
                shared.
              </p>
            </div>
          </div>
        </section>

        <section id="developers" className="section section-soft">
          <div className="container">
            <h2 className="section-title">Meet the creators</h2>
            <p className="section-subtitle">Passionate about building a fair skill economy</p>

            <div className="card-grid">
              <article className="dev-card">
                <div className="avatar">HB</div>
                <h3>Haseena Begum</h3>
                <p className="role-text">Frontend Architect</p>
                <p>
                  React expert &amp; design system lover. Building fluid experiences for swappers
                  worldwide.
                </p>
              </article>

              <article className="dev-card">
                <div className="avatar">RR</div>
                <h3>Rahul Roy</h3>
                <p className="role-text">Backend Engineer</p>
                <p>
                  Node.js &amp; Express wizard, securing seamless skill exchange logic and
                  databases.
                </p>
              </article>

              <article className="dev-card">
                <div className="avatar">AD</div>
                <h3>Aisha Desai</h3>
                <p className="role-text">UI/UX Visionary</p>
                <p>Human-centered design advocate, making trust &amp; usability effortless.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="reviews" className="section">
          <div className="container">
            <h2 className="section-title">What swappers say 💬</h2>
            <p className="section-subtitle">
              Real feedback from our community of skill enthusiasts
            </p>

            <div className="card-grid">
              <article className="review-card">
                <div className="rating">★★★★★</div>
                <p>
                  "Skill Swap Hub changed my learning journey - I taught Python and learned
                  professional photography in return. No cash needed, just mutual respect!"
                </p>
                <strong>- Priya Sharma</strong>
              </article>

              <article className="review-card">
                <div className="rating">★★★★★</div>
                <p>
                  "The reputation system makes it safe. I was hesitant at first, but after two
                  swaps I feel fully confident. Great platform for real collaboration."
                </p>
                <strong>- Arjun Mehta</strong>
              </article>

              <article className="review-card">
                <div className="rating">★★★★☆</div>
                <p>
                  "Finally, a place where I can share my graphic design skills and learn digital
                  marketing. Super intuitive and the community is awesome!"
                </p>
                <strong>- Neha Kapoor</strong>
              </article>
            </div>

            <div className="review-note-wrap">
              <span className="review-note">
                🔒 Verified reviews | Powered by transparent feedback mechanisms (Resnick et al.,
                2000)
              </span>
            </div>
          </div>
        </section>

        <section id="contact" className="section contact-section">
          <div className="container">
            <h2 className="section-title">Get in touch</h2>
            <p className="section-subtitle">
              Questions? Ideas? Let&apos;s shape the future of skill exchange together.
            </p>

            <form className="contact-form" onSubmit={handleContactSubmit}>
              <div className="form-group">
                <label htmlFor="fullName">Full name</label>
                <input id="fullName" type="text" placeholder="Alex Johnson" required />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input id="email" type="email" placeholder="hello@skillswap.com" required />
              </div>

              <div className="form-group">
                <label htmlFor="message">Your message</label>
                <textarea
                  id="message"
                  rows="4"
                  placeholder="I'd like to know how to list my skills..."
                />
              </div>

              <button type="submit" className="submit-btn">
                Send message ✨
              </button>
              <p className="privacy-note">We respect your privacy. No spam, ever.</p>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© 2026 Skill Swap Hub - Non-monetary skill exchange platform.</p>
          <p className="footer-note">
            Built on collaborative consumption principles &amp; trust systems | References:
            Hamari[1], Dellarocas[2], Belk[3]
          </p>
        </div>
      </footer>
    </>
  );
}

export default Home;
