const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3030;

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));

// static frontend
app.use(express.static(path.resolve(__dirname, '../frontend')));

// routes
app.use('/auth', require('./routes/auth.routes'));
app.use('/api/tenants', require('./routes/tenant.routes'));


// root
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log('Web server running at http://localhost:' + PORT);
});
