-- Skill Swap Hub SQL Schema
-- Compatible with MySQL 8+

CREATE DATABASE IF NOT EXISTS skillswap;
USE skillswap;

-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  city VARCHAR(120) NULL,
  password_hash VARCHAR(255) NOT NULL,
  bio TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================
-- SKILLS MASTER
-- =========================
CREATE TABLE IF NOT EXISTS skills (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  category VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =========================
-- USER SKILLS OFFERED
-- =========================
CREATE TABLE IF NOT EXISTS user_skills_offered (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  skill_id BIGINT UNSIGNED NOT NULL,
  level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
  note VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_offered_user_skill (user_id, skill_id),
  CONSTRAINT fk_offered_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_offered_skill FOREIGN KEY (skill_id)
    REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- USER SKILLS WANTED
-- =========================
CREATE TABLE IF NOT EXISTS user_skills_wanted (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  skill_id BIGINT UNSIGNED NOT NULL,
  level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner',
  note VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wanted_user_skill (user_id, skill_id),
  CONSTRAINT fk_wanted_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wanted_skill FOREIGN KEY (skill_id)
    REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================
-- SWAP REQUESTS
-- =========================
CREATE TABLE IF NOT EXISTS swap_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requester_id BIGINT UNSIGNED NOT NULL,
  receiver_id BIGINT UNSIGNED NOT NULL,
  offered_skill_id BIGINT UNSIGNED NOT NULL,
  requested_skill_id BIGINT UNSIGNED NOT NULL,
  message TEXT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',
  scheduled_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_swap_requester FOREIGN KEY (requester_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_swap_receiver FOREIGN KEY (receiver_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_swap_offered_skill FOREIGN KEY (offered_skill_id)
    REFERENCES skills(id) ON DELETE RESTRICT,
  CONSTRAINT fk_swap_requested_skill FOREIGN KEY (requested_skill_id)
    REFERENCES skills(id) ON DELETE RESTRICT,
  CONSTRAINT chk_swap_users_different CHECK (requester_id <> receiver_id)
) ENGINE=InnoDB;

-- =========================
-- REVIEWS
-- =========================
CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  swap_request_id BIGINT UNSIGNED NOT NULL,
  reviewer_id BIGINT UNSIGNED NOT NULL,
  reviewee_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_review_swap FOREIGN KEY (swap_request_id)
    REFERENCES swap_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviewer FOREIGN KEY (reviewer_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviewee FOREIGN KEY (reviewee_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_review_users_different CHECK (reviewer_id <> reviewee_id)
) ENGINE=InnoDB;

-- Helpful indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_swap_status ON swap_requests(status);
CREATE INDEX idx_swap_requester ON swap_requests(requester_id);
CREATE INDEX idx_swap_receiver ON swap_requests(receiver_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);

-- Seed common skills (optional)
INSERT IGNORE INTO skills (name, category) VALUES
  ('React', 'Technology'),
  ('Node.js', 'Technology'),
  ('Python', 'Technology'),
  ('UI/UX Design', 'Design'),
  ('Graphic Design', 'Design'),
  ('Public Speaking', 'Communication'),
  ('Guitar', 'Music'),
  ('Photography', 'Creative');
