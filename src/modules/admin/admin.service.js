import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../user/user.model.js";
import Admin from "../admin/admin.model.js";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../shared/utils/pagination.js";

//get self profile
export const getAdminProfile = async (adminId) => {
  const admin = await Admin.findOne({
    _id: adminId,
    isActive: true,
    role: { $in: ["admin", "super_admin"] },
  }).select("-password");

  if (!admin) {
    const error = new Error("Admin not found");
    error.statusCode = 404;
    throw error;
  }

  return admin;
};

//update self profile
export const updateAdminProfile = async (adminId, data) => {
  const { name } = data;

  const admin = await Admin.findOne({
    _id: adminId,
    isActive: true,
    role: { $in: ["admin", "super_admin"] },
  });

  if (!admin) {
    const error = new Error("Admin not found");
    error.statusCode = 404;
    throw error;
  }

  admin.name = name || admin.name;

  await admin.save();

  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
  };
};

//change self password
export const changeAdminPassword = async (adminId, data) => {
  const { currentPassword, newPassword } = data;

  const admin = await Admin.findOne({
    _id: adminId,
    isActive: true,
    role: { $in: ["admin", "super_admin"] },
  }).select("+password");

  if (!admin) {
    const error = new Error("Admin not found");
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(currentPassword, admin.password);

  if (!isMatch) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  admin.password = hashedPassword;

  await admin.save();

  return { message: "Password updated successfully" };
};

//create admin user
export const createAdminUser = async (data) => {
  const { name, email, password } = data;

  const existingUser = await Admin.findOne({ email });

  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const existingAdmin = await Admin.findOne({ role: "admin" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await Admin.create({
    name,
    email,
    role: "admin",
    password: hashedPassword,
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

//get all users with role
export const getAllUsers = async (query,currentUser) => {
  const {
    search = "",
    sortBy = "createdAt",
    order = "desc",
    isActive,
    role,
  } = query;
  const { page, limit, skip } = normalizePagination(query);

    const excludeSelf = currentUser?._id
    ? { _id: { $ne: currentUser._id } }
    : {};

  const searchFilter = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const activeFilter =
    isActive !== undefined
      ? { isActive: isActive === "true" }
      : { isActive: true };

  const baseFilter = {
    ...searchFilter,
    ...activeFilter,
  };

  const sort = { [sortBy]: order === "asc" ? 1 : -1 };

  const normalizedRole = role?.toLowerCase();

  if (normalizedRole === "user") {
    const filter = { ...baseFilter };
    const [userDocs, userTotal] = await Promise.all([
      User.find(filter).select("-password").sort(sort).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    return {
      pagination: buildPaginationMeta({ total: userTotal, page, limit }),
      users: userDocs,
    };
  }

  if (normalizedRole === "admin") {
    const filter = { ...baseFilter,  role: { $in: ["admin", "super_admin"] },
      ...excludeSelf };
    const [adminDocs, adminTotal] = await Promise.all([
      Admin.find(filter).select("-password").sort(sort).skip(skip).limit(Number(limit)),
      Admin.countDocuments(filter),
    ]);

    return {
      pagination: buildPaginationMeta({ total: adminTotal, page, limit }),
      users: adminDocs,
    };
  }

  const userFilter = { ...baseFilter };
    const adminFilter = {
    ...baseFilter,
    role: { $in: ["admin", "super_admin"] },
    ...excludeSelf,
  };

  const [userDocs, adminDocs, userTotal, adminTotal] = await Promise.all([
    User.find(userFilter).select("-password").sort(sort),
    Admin.find(adminFilter).select("-password").sort(sort),
    User.countDocuments(userFilter),
    Admin.countDocuments(adminFilter),
  ]);

  const users = [...userDocs, ...adminDocs]
    .sort((a, b) => {
      const aValue = new Date(a[sortBy] || a.createdAt).getTime();
      const bValue = new Date(b[sortBy] || b.createdAt).getTime();
      return order === "asc" ? aValue - bValue : bValue - aValue;
    })
    .slice(skip, skip + Number(limit));

  return {
    pagination: buildPaginationMeta({ total: userTotal + adminTotal, page, limit }),
    users,
  };
};

//get user by id
export const getUserById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const user =
    (await User.findById(userId).select("-password")) ||
    (await Admin.findById(userId).select("-password"));
  
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  } 

  return user;
};

//update users status (active/inactive)
export const updateUserStatus = async ({ targetUserId, isActive, requester }) => {
  const user = (await User.findById(targetUserId)) || (await Admin.findById(targetUserId));

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (String(user._id) === String(requester.id)) {
    const error = new Error("You cannot update your own status");
    error.statusCode = 403;
    throw error;
  }

  if (requester.role === "admin" && user.role !== "user") {
    const error = new Error("Admin can update user status only");
    error.statusCode = 403;
    throw error;
  }

  if (requester.role === "super_admin" && user.role === "super_admin") {
    const error = new Error("Super admin cannot update own status");
    error.statusCode = 403;
    throw error;
  }

  user.isActive = isActive;
  await user.save();

  return user;
};
