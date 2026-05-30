// Promote (or demote) a user to admin by email, from the command line.
//
//   node scripts/make-admin.js user@example.com           # grant admin
//   node scripts/make-admin.js user@example.com --revoke   # back to user
//
// This is the supported way to create the very first admin, since the public
// /api/register endpoint always creates role: "user".

const fs = require("fs");
const path = require("path");

// Run via plain `node`, where (unlike Next.js or the Prisma CLI) nothing loads
// the .env file, so DATABASE_URL would be missing. Parse the env files
// ourselves — dependency-free so it works on a fresh server without dotenv.
// Precedence matches Next.js: a value already in process.env wins, then
// .env.production.local, .env.local, .env.production, .env.
function loadEnv() {
  const files = [
    ".env.production.local",
    ".env.local",
    ".env.production",
    ".env",
  ];
  for (const file of files) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (!key || key in process.env) continue;
      let value = line.slice(eq + 1).trim();
      // Strip a single matching pair of surrounding quotes.
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

loadEnv();

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
