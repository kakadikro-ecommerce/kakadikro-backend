import bcrypt from "bcrypt";
import User from "../user/model.js";

export const registerUser = async (data) => {
  const { name, email, role, password } = data;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  } 

   if (role === "admin") {
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      const error = new Error("Admin already exists in the system");
      error.statusCode = 409;
      throw error;
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    role:"user",
    password: hashedPassword,
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

export const loginUser = async (data) => {
  const { email, password } = data;

  const user = await User.findOne({ email ,isActive: true }).select("+password");

  if (!user || !user.isActive) {
    const error = new Error("Invalid email or password or account is deactivated");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  return {
    userDocument: user,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
