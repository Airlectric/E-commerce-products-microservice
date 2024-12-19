// product microservice validateRole.js
const validateRole = (roles) => (req, res, next) => {
	console.log(req.user.role)
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied by product service' });
    }
    next();
  };


module.exports = validateRole;
  

