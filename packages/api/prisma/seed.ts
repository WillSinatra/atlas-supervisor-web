import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@atlas.local' },
    update: {},
    create: {
      email: 'admin@atlas.local',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Atlas',
      role: 'SUPER_ADMIN',
      phone: '+5491123456789',
    },
  });

  console.log('Admin user created:', admin.email);

  // Create SLAs
  console.log('Creating SLAs...');
  await prisma.sLA.createMany({
    data: [
      {
        name: 'Crítico 4h',
        description: 'Sin servicio total.',
        priority: 'CRITICAL',
        type: 'REPAIR',
        responseTime: 30,
        resolveTime: 240,
      },
      {
        name: 'Alta 8h',
        description: 'Falla masiva en zona.',
        priority: 'HIGH',
        type: 'REPAIR',
        responseTime: 60,
        resolveTime: 480,
      },
      {
        name: 'Media 24h',
        description: 'Falla individual.',
        priority: 'MEDIUM',
        type: 'REPAIR',
        responseTime: 120,
        resolveTime: 1440,
      },
      {
        name: 'Baja 72h',
        description: 'Instalación nueva.',
        priority: 'LOW',
        type: 'INSTALLATION',
        responseTime: 240,
        resolveTime: 4320,
      },
    ],
    skipDuplicates: true,
  });
  console.log('SLAs created.');

  // Create Customers
  console.log('Creating customers...');
  const customer1 = await prisma.customer.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '0987654321',
    },
  });
  console.log('Customers created.');

  // Create Crews
  console.log('Creating crews...');
  const crew1 = await prisma.crew.create({
    data: {
      name: 'Crew A',
      code: 'CRA',
      status: 'AVAILABLE',
    },
  });

  const crew2 = await prisma.crew.create({
    data: {
      name: 'Crew B',
      code: 'CRB',
      status: 'BUSY',
    },
  });

  const crew3 = await prisma.crew.create({
    data: {
      name: 'Crew C',
      code: 'CRC',
      status: 'OFFLINE',
    },
  });
  console.log('Crews created.');

  // Create Work Orders
  console.log('Creating work orders...');
  const slaCritical = await prisma.sLA.findFirst({ where: { priority: 'CRITICAL' } });

  await prisma.workOrder.createMany({
    data: [
      // Pending
      {
        orderNumber: 'WO-001',
        title: 'Fix internet connection',
        status: 'PENDING',
        priority: 'HIGH',
        customerId: customer1.id,
        createdById: admin.id,
      },
      // Assigned
      {
        orderNumber: 'WO-002',
        title: 'Install new router',
        status: 'ASSIGNED',
        priority: 'MEDIUM',
        customerId: customer2.id,
        createdById: admin.id,
        assignedToId: admin.id,
        crewId: crew1.id,
      },
      // Accepted
      {
        orderNumber: 'WO-003',
        title: 'Check wiring',
        status: 'ACCEPTED',
        priority: 'MEDIUM',
        customerId: customer1.id,
        createdById: admin.id,
        assignedToId: admin.id,
        crewId: crew2.id,
      },
      // In Progress
      {
        orderNumber: 'WO-004',
        title: 'Replace damaged cable',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        customerId: customer2.id,
        createdById: admin.id,
        assignedToId: admin.id,
        crewId: crew2.id,
      },
      // Completed Today
      {
        orderNumber: 'WO-005',
        title: 'Initial setup',
        status: 'COMPLETED',
        priority: 'LOW',
        customerId: customer1.id,
        createdById: admin.id,
        assignedToId: admin.id,
        crewId: crew1.id,
        completedAt: new Date(),
      },
      // Overdue
      {
        orderNumber: 'WO-006',
        title: 'Fix TV signal',
        status: 'PENDING',
        priority: 'CRITICAL',
        customerId: customer2.id,
        createdById: admin.id,
        scheduledEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        slaId: slaCritical!.id,
      },
    ],
  });
  console.log('Work orders created.');

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
