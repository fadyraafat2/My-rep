const users = [
  { id: 1, username: "admin", password: "admin123", role: "admin" },
  { id: 2, username: "user", password: "user123", role: "user" }
];

function findUser(username) {
  return users.find(u => u.username === username);
}

module.exports = { findUser };
