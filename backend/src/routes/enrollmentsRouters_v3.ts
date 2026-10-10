import { Router, type Request, type Response } from "express";
import { zEnrollmentBody, zEnrollmentPutBody } from "../libs/zodValidators";

import type { CustomRequest } from "../libs/types.ts";

import { authenticateToken } from "../middlewares/authenMiddleware";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware";

import { PrismaClient } from "../../generated/prisma/client";
const prisma = new PrismaClient();

const router = Router();

router.get(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const enrollments = await prisma.enrollment.findMany({
        where:
          user?.role === "STUDENT" ? { studentId: user.studentId ?? "" } : {},
        orderBy: { createdAt: "asc" },
      });

      return res.json({
        success: true,
        data: enrollments,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

router.post(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const result = zEnrollmentBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }
      const { studentId, courseId } = result.data;
      const user = req.user;
      if (user?.role === "STUDENT" && studentId !== user.studentId) {
        return res.status(403).json({ success: false, message: "Forbidden access" });
      }

      const student = await prisma.student.findUnique({ where: { studentId } });
      if (!student) {
        return res.status(404).json({ success: false, message: `Student ${studentId} does not exists` });
      }
      const course = await prisma.course.findUnique({ where: { courseId } });
      if (!course) {
        return res.status(404).json({ success: false, message: `Course ${courseId} does not exists` });
      }

      const enrolled = await prisma.enrollment.findFirst({ where: { studentId, courseId } });
      if (enrolled) {
        return res.status(409).json({ success: false, message: `Student already enrolled` });
      }

      const created = await prisma.enrollment.create({
        data: { studentId, courseId },
      });

      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Something is wrong", error: err });
    }
  },
);


router.put(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const result = zEnrollmentPutBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ success: false, message: "Validation failed" });
      }
      const { studentId, courseId, newCourseId } = result.data;

      if (user?.role === "STUDENT" && studentId !== user.studentId) {
        return res.status(403).json({ success: false, message: "Forbidden access" });
      }
      if (courseId === newCourseId) {
        return res.status(400).json({ success: false, message: "Same course" });
      }

      const existing = await prisma.enrollment.findFirst({ where: { studentId, courseId } });
      if (!existing) {
        return res.status(404).json({ success: false, message: "Original enrollment not found" });
      }

      const newCourse = await prisma.course.findUnique({ where: { courseId: newCourseId } });
      if (!newCourse) {
        return res.status(404).json({ success: false, message: "New course not found" });
      }

      const duplicate = await prisma.enrollment.findFirst({ where: { studentId, courseId: newCourseId } });
      if (duplicate) {
        return res.status(409).json({ success: false, message: "Already enrolled" });
      }

      const updated = await prisma.enrollment.update({
        where: { id: existing.id },
        data: { courseId: newCourseId },
      });

      return res.status(200).json({ success: true, message: "Updated", data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Error", error: err });
    }
  }
);

router.delete(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const result = zEnrollmentBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ success: false, message: "Validation failed" });
      }
      const { studentId, courseId } = result.data;

      if (user?.role === "STUDENT" && studentId !== user.studentId) {
        return res.status(403).json({ success: false, message: "Forbidden access" });
      }

      const existing = await prisma.enrollment.findFirst({ where: { studentId, courseId } });
      if (!existing) {
        return res.status(404).json({ success: false, message: "Enrollment not found" });
      }

      const deleted = await prisma.enrollment.delete({ where: { id: existing.id } });

      return res.status(200).json({ success: true, message: "Deleted", data: deleted });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Error", error: err });
    }
  }
);

export default router;