const { login } = require("../src/auth");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Tests
const success = login("admin", "admin123");
assert(success.success === true, "Admin should login successfully");

const wrongPass = login("admin", "wrong");
assert(wrongPass.success === false, "Login should fail with wrong password");

console.log("All tests passed!");
