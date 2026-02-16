const { findUser } = require("./users");

function login(username, password) {
  const user = findUser(username);

  if (!user) {
    return { success: false, message: "Invalid credentials" };
  }

  if (user.password !== password) {
    return { success: false, message: "Invalid credentials" };
  }

  return {
    success: true,
    message: "Login successful",
    role: user.role
  };
}

module.exports = { login };
