// Promote (or demote) a user to admin by email, from the command line.
//
//   node scripts/make-admin.js user@example.com           # grant admin
//   node scripts/make-admin.js user@example.com --revoke   # back to user
//
// This is the supported way to create the very first admin, since the public
// /api/register endpoint always creates role: "user". Prisma loads DATABASE_URL
// from .env automatically, so no extra env wiring is needed.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");

  if (!email) {
    console.error("Usage: node scripts/make-admin.js <email> [--revoke]");
    process.exit(1);
  }

  const role = revoke ? "user" : "admin";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  if ((user.role ?? "user") === role) {
    console.log(`${email} already has role "${role}". Nothing to do.`);
    return;
  }

  await prisma.user.update({ where: { email }, data: { role } });
  console.log(`Updated ${email}: ${user.role ?? "user"} -> ${role}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
