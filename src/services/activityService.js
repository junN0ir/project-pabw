import db from "../config/db.js";

export const logActivity = async ({ userId, userType, activityType, details }) => {
  try {
    await db.execute(
      `INSERT INTO ActivityLog (userId, userType, activityType, details) VALUES (?, ?, ?, ?)`,
      [userId, userType, activityType, JSON.stringify(details)]
    );
  } catch (error) {
    console.error("Gagal log activity:", error);
  }
};
