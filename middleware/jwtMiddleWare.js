// middleware/authenticate.js
const jwt = require("jsonwebtoken");

class webTokenMiddleWare {
  adminAuthenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1]; // Split the header and extract the token
      if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
          if (err) {
            return res.json({ err: true, msg: err.message });
          }
          if (decoded.role !== 'Admin') {
            // 1 = Admin
            return res.json({
              err: true,
              msg: "Permission is denined!",
              h: decoded.role,
            });
          }
          req.user = decoded;
          next();
        });
      } else {
        res.status(401).json({ msg: "Bearer token is required." });
      }
    } else {
      res.status(401).json({ msg: "Authorization header is missing." });
    }
  };
}

module.exports = webTokenMiddleWare;
