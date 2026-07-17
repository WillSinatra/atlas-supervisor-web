import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@atlas.com' },
    update: {},
    create: {
      email: 'admin@atlas.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Atlas',
      role: 'SUPER_ADMIN',
      phone: '+5491123456789',
    },
  });

  console.log('Admin user created:', admin.email);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
