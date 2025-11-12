const jwt = require("jsonwebtoken");

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role }, // ✅ Role added
    process.env.JWT_SECRET || "your-secret-key",
    {
      expiresIn: "30d",
    }
  );
};

module.exports = generateToken;
