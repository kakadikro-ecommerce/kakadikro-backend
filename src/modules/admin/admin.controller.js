import * as adminService from "./admin.service.js";

//create admin
export const createAdminUser = async (req, res, next) => {
  try {
    if (req.user?.role !== "super_admin") {
      const error = new Error("Only super admin can create admin users");
      error.statusCode = 403;
      throw error;
    }

    const user = await adminService.createAdminUser(req.body);

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

//get self profile
export const getProfile = async (req, res, next) => {
  try {
    const admin = await adminService.getAdminProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    next(error);
  }
};

//update self profile
export const updateProfile = async (req, res, next) => {
  try {
    const result = await adminService.updateAdminProfile(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//change self password
export const changePassword = async (req, res, next) => {
  try {
    const result = await adminService.changeAdminPassword(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

//get all users with role
export const getAllUsers = async (req, res, next) => {
  try {
    const result = await adminService.getAllUsers(req.query,req.user);

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      pagination: result.pagination,
      data: result.users,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

//update users status (active/inactive)
export const updateUserStatus = async (req, res, next) => {
  try {
    const user = await adminService.updateUserStatus({
      targetUserId: req.params.id,
      isActive: req.body.isActive,
      requester: req.user,
    });

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
