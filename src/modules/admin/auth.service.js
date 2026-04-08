import bcrypt from "bcrypt";
import Admin from "./admin.model.js";

export const loginAdmin = async (data) => {
  const { email, password } = data;

  const admin = await Admin.findOne({
    email,
    role: { $in: ["admin", "super_admin"] },
    isActive: true,
  }).select("+password");

  if (!admin || !admin.role === "super_admin") {
    const error = new Error("Invalid email or password or account is deactivated");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, admin.password);

  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  return {
    userDocument: admin,
    user: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
};
