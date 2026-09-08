import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

const permissions = [
  { name: 'users:read', description: 'View users' },
  { name: 'users:create', description: 'Create users' },
  { name: 'users:update', description: 'Update users' },
  { name: 'users:delete', description: 'Delete users' },
  { name: 'jobs:read', description: 'View jobs' },
  { name: 'jobs:create', description: 'Create jobs' },
  { name: 'jobs:assign', description: 'Assign jobs' },
  { name: 'jobs:claim', description: 'Claim jobs' },
];
const roles = [
  {
    name: 'admin',
    description: 'Full system access',
    permissions: [
      'users:read',
      'users:create',
      'users:update',
      'users:delete',
      'jobs:read',
      'jobs:create',
      'jobs:assign',
      'jobs:claim',
    ],
  },
  {
    name: 'dispatcher',
    description: 'Manage and dispatch jobs',
    permissions: ['jobs:read', 'jobs:create', 'jobs:assign'],
  },
  {
    name: 'driver',
    description: 'Handle assigned and claimable jobs',
    permissions: ['jobs:read', 'jobs:claim'],
  },
];
async function main() {
  console.log('Seeding permissions...');
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: { description: permission.description },
      create: permission,
    });
  }
  console.log('Seeding roles...');
  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
    for (const permissionName of role.permissions) {
      const permission = await prisma.permission.findUnique({
        where: {
          name: permissionName,
        },
      });

      if (!permission) {
        throw new Error(`Permission "${permissionName}" not found`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: createdRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: createdRole.id,
          permissionId: permission.id,
        },
      });
    }
  }
  console.log('Authorization seed completed.');
}
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
