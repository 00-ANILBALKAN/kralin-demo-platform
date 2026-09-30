const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

// storage dizini yoksa oluştur
const storageDir = path.dirname(config.DB_PATH);
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const db = new DatabaseSync(config.DB_PATH);

// Veritabanı tablolarını başlat
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    password TEXT,
    description TEXT,
    storage_path TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    views_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

const dbService = {
  getAllProjects() {
    const stmt = db.prepare(`SELECT * FROM projects ORDER BY id DESC`);
    return stmt.all();
  },

  getProjectBySlug(slug) {
    const stmt = db.prepare(`SELECT * FROM projects WHERE slug = ?`);
    return stmt.get(slug);
  },

  getProjectById(id) {
    const stmt = db.prepare(`SELECT * FROM projects WHERE id = ?`);
    return stmt.get(id);
  },

  createProject({ name, slug, password, description, storage_path }) {
    const stmt = db.prepare(`
      INSERT INTO projects (name, slug, password, description, storage_path)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, slug, password || null, description || '', storage_path);
    return this.getProjectById(result.lastInsertRowid);
  },

  updateProject(id, { name, password, description, is_active, storage_path }) {
    const project = this.getProjectById(id);
    if (!project) return null;

    const newName = name !== undefined ? name : project.name;
    const newPassword = password !== undefined ? (password === '' ? null : password) : project.password;
    const newDescription = description !== undefined ? description : project.description;
    const newIsActive = is_active !== undefined ? is_active : project.is_active;
    const newStorage = storage_path !== undefined ? storage_path : project.storage_path;

    const stmt = db.prepare(`
      UPDATE projects
      SET name = ?, password = ?, description = ?, is_active = ?, storage_path = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);
    stmt.run(newName, newPassword, newDescription, newIsActive, newStorage, id);
    return this.getProjectById(id);
  },

  deleteProject(id) {
    const project = this.getProjectById(id);
    if (!project) return null;
    const stmt = db.prepare(`DELETE FROM projects WHERE id = ?`);
    stmt.run(id);
    return project;
  },

  incrementViews(slug) {
    const stmt = db.prepare(`
      UPDATE projects SET views_count = views_count + 1 WHERE slug = ?
    `);
    stmt.run(slug);
  }
};

module.exports = dbService;
