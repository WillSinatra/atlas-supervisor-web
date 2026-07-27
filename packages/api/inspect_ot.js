const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const orders = await p.workOrder.findMany({
    where: { orderNumber: { startsWith: 'OT-' } },
    include: {
      createdBy: { select: { email: true } },
      timeline: { orderBy: { createdAt: 'asc' } },
      auditLogs: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { orderNumber: 'asc' },
  });
  console.log(JSON.stringify(orders.map(o => ({
    orderNumber: o.orderNumber,
    title: o.title,
    createdAt: o.createdAt,
    createdBy: o.createdBy?.email,
    source: o.source,
    timelineTitles: o.timeline.map(t => t.title),
    auditActions: o.auditLogs.map(a => a.action),
  })), null, 2));
  await p.$disconnect();
})();
