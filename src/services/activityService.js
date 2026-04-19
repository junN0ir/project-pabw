import prisma from "../config/prisma.js";

export const logActivity = async ({
  userId,
  userType,
  activityType,
  details
}) => {
  try {
    await prisma.ActivityLog.create({
      data: {
        userId,
        userType,
        activityType,
        details
      }
    });
  } catch (error) {
    console.error("Gagal log activity:", error);
  }
};
