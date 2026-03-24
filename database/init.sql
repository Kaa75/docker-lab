CREATE DATABASE IF NOT EXISTS docker_lab;
USE docker_lab;

CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO items (name, description) VALUES
('Docker', 'Container platform for building and deploying applications'),
('Nginx', 'High-performance web server and reverse proxy'),
('Express', 'Fast, minimalist Node.js web framework'),
('MySQL', 'Open-source relational database management system'),
('Swarm', 'Docker native clustering and orchestration tool');
