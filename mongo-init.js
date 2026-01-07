// MongoDB initialization script
// This script runs when the container first starts

// Switch to the application database
db = db.getSiblingDB('spainaikikai');

// Create application user with limited permissions
db.createUser({
  user: 'spainaikikai_user',
  pwd: 'spainaikikai_password',
  roles: [
    {
      role: 'readWrite',
      db: 'spainaikikai'
    }
  ]
});

// Create initial collections (optional)
db.createCollection('clubs');
db.createCollection('members');
db.createCollection('payments');
db.createCollection('seminars');
db.createCollection('licenses');

print('MongoDB initialized successfully for Spain Aikikai Admin');