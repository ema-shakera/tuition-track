const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { env } = require("../config/env");
const { ApiError } = require("../middleware/errorHandler");
const User = require("../models/User");

const SALT_ROUNDS = 12;

const createToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

const toPublicUser = (user) => ({
  id: String(user._id),
  email: user.email,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");

const register = async (req, res) => {
  const { email, password, role } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new ApiError(400, "Email is required");
  }

  if (typeof password !== "string" || password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  if (!["teacher", "student"].includes(role)) {
    throw new ApiError(400, "Role must be one of: teacher, student");
  }

  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    throw new ApiError(409, "Email already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    role,
    status: "active",
  });

  const token = createToken(user);

  res.status(201).json({
    token,
    user: toPublicUser(user),
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || typeof password !== "string") {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (user.status !== "active") {
    throw new ApiError(403, "Account is suspended");
  }

  const token = createToken(user);

  res.status(200).json({
    token,
    user: toPublicUser(user),
  });
};

const me = async (req, res) => {
  const user = await User.findById(req.auth.userId).lean();
  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  res.status(200).json({ user: toPublicUser(user) });
};

module.exports = {
  register,
  login,
  me,
};
