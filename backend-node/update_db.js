import prisma from './db.js';

async function run() {
  try {
    console.log("Adding course_name column...");
    await prisma.$executeRawUnsafe("ALTER TABLE certificates ADD COLUMN course_name VARCHAR(255) NULL;");
    console.log("Success.");
  } catch (e) {
    console.log(e.message);
  }

  try {
    console.log("Dropping unique constraint...");
    await prisma.$executeRawUnsafe("ALTER TABLE certificates DROP INDEX certificates_user_id_student_name_template_name_key;");
    console.log("Success.");
  } catch (e) {
    console.log(e.message);
  }

  try {
    console.log("Adding index for course_name...");
    await prisma.$executeRawUnsafe("CREATE INDEX certificates_course_name_idx ON certificates(course_name);");
    console.log("Success.");
  } catch (e) {
    console.log(e.message);
  }

  await prisma.$disconnect();
  console.log("DB update complete.");
}

run();
