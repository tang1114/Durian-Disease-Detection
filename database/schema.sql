CREATE DATABASE IF NOT EXISTS csc_480_db;
USE csc_480_db;

CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Disease_Types (
    disease_id INT AUTO_INCREMENT PRIMARY KEY,
    disease_name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS Diagnoses (
    diag_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    disease_id INT NOT NULL,
    image_url VARCHAR(255),
    confidence FLOAT,
    severity VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (disease_id) REFERENCES Disease_Types(disease_id)
);