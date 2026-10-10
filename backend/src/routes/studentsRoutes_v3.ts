import { Router, type Request, type Response } from "express";
import { zStudentPostBody, zStudentId, zStudentPutBody } from "../libs/zodValidators.js";

import type { Student, CustomRequest } from "../libs/types.js";

import { authenticateToken } from "../middlewares/authenMiddleware";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminDBMiddleware";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware";

import { PrismaClient } from "../../generated/prisma/client";
const prisma = new PrismaClient();

const router = Router();

router.get(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: Request, res: Response) => {
    try {
      const students = await prisma.student.findMany({
        include: { files: true },
      });
      const program = req.query.program;
      if (program) {
        let filtered_students = students.filter(
          (student: any) => student.program === program,
        );
        return res.json({
          success: true,
          data: filtered_students,
        });
      } else {
        return res.json({
          success: true,
          data: students,
        });
      }
    } catch (err) {
      return res.json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

router.get(
  "/:studentId",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const studentId = req.params.studentId as string;
      const result = zStudentId.safeParse(studentId);
      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      let found_student = await prisma.student.findUnique({
        where: { studentId: studentId },
      });

      if (!found_student) {
        return res.status(404).json({
          success: false,
          message: "Student does not exists",
        });
      }

      if (
        user?.role === "STUDENT" &&
        found_student.studentId !== user.studentId
      ) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      res.json({
        success: true,
        data: found_student,
      });
    } catch (err) {
      return res.json({
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
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const body = (await req.body) as Student;
      const result = zStudentPostBody.safeParse(body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const student = await prisma.student.findUnique({
        where: { studentId: result.data.studentId },
      });
      if (student) {
        return res.status(400).json({
          success: false,
          message: "The StudentID is already taken.",
        });
      }

      const { studentId, firstName, lastName, program, interests, emails } =
        result.data;
      const created = await prisma.student.create({
        data: {
          studentId,
          firstName,
          lastName,
          program,
          interests,
          emails,
        },
      });

      res.set("Link", `/api/v3/students/${created.studentId}`);

      return res.status(201).json({
        success: true,
        data: created,
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


router.put(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const body = await req.body;
      const result = zStudentPutBody.safeParse(body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const { studentId, firstName, lastName, program, interests, emails } = result.data;

      if (user?.role === "STUDENT" && studentId !== user.studentId) {
        return res.status(403).json({ success: false, message: "Forbidden access" });
      }

      const existingStudent = await prisma.student.findUnique({
        where: { studentId },
      });
      if (!existingStudent) {
        return res.status(404).json({ success: false, message: "Student does not exist" });
      }

      const updateData: any = {};
      if (firstName !== undefined && firstName !== null) updateData.firstName = firstName;
      if (lastName !== undefined && lastName !== null) updateData.lastName = lastName;
      if (program !== undefined && program !== null) updateData.program = program;
      if (interests !== undefined && interests !== null) updateData.interests = interests;
      if (emails !== undefined && emails !== null) updateData.emails = emails;

      const updated = await prisma.student.update({
        where: { studentId },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        message: "Student updated successfully",
        data: updated,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

router.delete(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const body = await req.body;
      const studentId = body.studentId;
      const result = zStudentId.safeParse(studentId);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const existingStudent = await prisma.student.findUnique({
        where: { studentId },
      });
      if (!existingStudent) {
        return res.status(404).json({ success: false, message: "Student does not exist" });
      }

      await prisma.$transaction([
        prisma.enrollment.deleteMany({ where: { studentId } }),
        prisma.student.delete({ where: { studentId } }),
      ]);

      return res.status(200).json({
        success: true,
        message: "Student deleted successfully",
        data: existingStudent,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

export default router;