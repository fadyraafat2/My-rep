const { findUser } = require("./users");

function login(username, password) {
  if (typeof password !== "string" || password.length < 8) {
  return { success: false, message: "Password must be at least 8 characters" };
}
  const user = findUser(username);
  


  if (!user) {
    return { success: false, message: "User not found" };
  }

  if (user.password !== password) {
    return { success: false, message: "Invalid password" };
  }

  return {
    success: true,
    message: "Login successful",
    role: user.role
  };
}

module.exports = { login };
