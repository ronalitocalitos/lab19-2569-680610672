import { z } from "zod";

////// Course Validators //////

export const zCourseId = z
  .string()
  .length(6, { message: "Course ID must be 6 digits." });
const zCourseTitle = z
  .string()
  .min(6, { message: "Course title must be at least 6 charaters." });
const zInstructors = z.array(z.string()).min(1);

export const zCoursePostBody = z.object({
  courseId: zCourseId,
  courseTitle: zCourseTitle,
  instructors: zInstructors,
});

export const zCoursePutBody = z.object({
  courseId: zCourseId,
  courseTitle: zCourseTitle.nullish(),
  instructors: zInstructors.nullish(),
});

//////  Student Validators //////

const MAX_INTERESTS = 3;
const MAX_EMAILS = 3;

export const zStudentId = z
  .string()
  .trim()
  .regex(/^\d{9}$/, { message: "รหัสนักศึกษาต้องเป็นตัวเลข 9 หลัก" });
const zFirstName = z
  .string()
  .trim()
  .min(3, { message: "ชื่อต้องมีอย่างน้อย 3 ตัวอักษร" });
const zLastName = z
  .string()
  .trim()
  .min(3, { message: "นามสกุลต้องมีอย่างน้อย 3 ตัวอักษร" });
const zProgram = z.enum(["CPE", "ISNE"], {
  message: "เลือกหลักสูตร",
});
const zCourses = z.array(zCourseId);
const zInterests = z
  .array(z.string())
  .min(1, { message: "เลือกความสนใจอย่างน้อย 1 ด้าน" })
  .max(MAX_INTERESTS, { message: `เลือกได้ไม่เกิน ${MAX_INTERESTS} ด้าน` });
// Frontend ส่ง emails เป็น string[] (map จาก { address } แล้ว)
const zEmails = z
  .array(
    z
      .string()
      .trim()
      .pipe(z.email({ message: "อีเมลไม่ถูกต้อง" })),
  )
  .min(1, { message: "ต้องมีอีเมลอย่างน้อย 1 อีเมล" })
  .max(MAX_EMAILS, { message: `มีอีเมลได้ไม่เกิน ${MAX_EMAILS} อีเมล` })
  .refine(
    (items) => new Set(items.map((e) => e.toLowerCase())).size === items.length,
    { message: "อีเมลซ้ำกัน" },
  );

export const zStudentPostBody = z.object({
  studentId: zStudentId,
  firstName: zFirstName,
  lastName: zLastName,
  program: zProgram,
  course: zCourses.nullish(),
  interests: zInterests,
  emails: zEmails,
});

export const zStudentPutBody = z.object({
  studentId: zStudentId,
  firstName: zFirstName.nullish(), //firstName can be null or undefined
  lastName: zLastName.nullish(), //lastName can be null or undefined
  program: zProgram.nullish(), //program can be null or undefined
  interests: zInterests.nullish(),
  emails: zEmails.nullish(),
});

////// Enrollment Validators //////

export const zEnrollmentBody = z.object({
  studentId: zStudentId,
  courseId: zCourseId,
});

////// User Validators //////
export const zUserBody = z.object({
  username: zFirstName,
  password: zFirstName,
  studentId: zStudentId.nullish(),
  role: z.enum(["STUDENT", "ADMIN"], {
    message: "Role must be either STUDENT or ADMIN",
  }),
});

export const zEnrollmentPutBody = z.object({
  studentId: zStudentId,
  courseId: zCourseId,
  newCourseId: zCourseId,
});