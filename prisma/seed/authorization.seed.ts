import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

/**
============================================================
Permissions
============================================================ */
const permissions = [
  { name: 'users:read', description: 'View users' },
  { name: 'users:create', description: 'Create users' },
  { name: 'users:update', description: 'Update users' },
  { name: 'users:delete', description: 'Delete users' },
  { name: 'drivers:read', description: 'View drivers' },
  { name: 'drivers:create', description: 'Create drivers' },
  { name: 'drivers:update', description: 'Update drivers' },
  { name: 'jobs:read', description: 'View jobs' },
  { name: 'jobs:create', description: 'Create jobs' },
  { name: 'jobs:assign', description: 'Assign jobs' },
  { name: 'jobs:claim', description: 'Claim jobs' },
];

/**
============================================================
Roles
============================================================ */
const roles = [
  {
    name: 'admin',
    description: 'Full system access',
    permissions: [
      'users:read',
      'users:create',
      'users:update',
      'users:delete',
      'drivers:read',
      'drivers:create',
      'drivers:update',

      'jobs:read',
      'jobs:create',
      'jobs:assign',
      'jobs:claim',
    ],
  },
  {
    name: 'dispatcher',
    description: 'Manage and dispatch jobs',
    permissions: ['jobs:read', 'jobs:create', 'jobs:assign', 'drivers:read'],
  },
  {
    name: 'driver',
    description: 'Handle assigned and claimable jobs',
    permissions: ['jobs:read', 'jobs:claim'],
  },
];

/**
============================================================
Users
============================================================ */
type SeedUser = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  licenseNumber?: string;
  driverStatus?: 'OFFLINE' | 'AVAILABLE' | 'BUSY' | 'SUSPENDED';
};

const users: SeedUser[] = [
  // ---------------------------------------------------------- // Admins // ----------------------------------------------------------
  {
    email: 'oliver.bennett@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Oliver',
    lastName: 'Bennett',
    role: 'admin',
  },
  {
    email: 'sophia.mitchell@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Sophia',
    lastName: 'Mitchell',
    role: 'admin',
  },
  {
    email: 'daniel.carter@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Daniel',
    lastName: 'Carter',
    role: 'admin',
  },
  {
    email: 'emma.thompson@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Emma',
    lastName: 'Thompson',
    role: 'admin',
  },
  {
    email: 'liam.anderson@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Liam',
    lastName: 'Anderson',
    role: 'admin',
  },
  // ---------------------------------------------------------- // Dispatchers // ----------------------------------------------------------
  {
    email: 'james.wilson@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'James',
    lastName: 'Wilson',
    role: 'dispatcher',
  },
  {
    email: 'ava.martin@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Ava',
    lastName: 'Martin',
    role: 'dispatcher',
  },
  {
    email: 'noah.harris@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Noah',
    lastName: 'Harris',
    role: 'dispatcher',
  },
  {
    email: 'mia.clark@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Mia',
    lastName: 'Clark',
    role: 'dispatcher',
  },
  {
    email: 'ethan.lewis@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Ethan',
    lastName: 'Lewis',
    role: 'dispatcher',
  },
  // ---------------------------------------------------------- // Drivers // ----------------------------------------------------------
  {
    email: 'michael.walker@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Michael',
    lastName: 'Walker',
    role: 'driver',
    licenseNumber: 'DRV-10001',
    driverStatus: 'AVAILABLE',
  },
  {
    email: 'isabella.hall@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Isabella',
    lastName: 'Hall',
    role: 'driver',
    licenseNumber: 'DRV-10002',
    driverStatus: 'BUSY',
  },
  {
    email: 'benjamin.young@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Benjamin',
    lastName: 'Young',
    role: 'driver',
    licenseNumber: 'DRV-10003',
    driverStatus: 'OFFLINE',
  },
  {
    email: 'charlotte.king@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Charlotte',
    lastName: 'King',
    role: 'driver',
    licenseNumber: 'DRV-10004',
    driverStatus: 'AVAILABLE',
  },
  {
    email: 'alexander.wright@fleetops.local',
    password: 'FleetOps@123',
    firstName: 'Alexander',
    lastName: 'Wright',
    role: 'driver',
    licenseNumber: 'DRV-10005',
    driverStatus: 'OFFLINE',
  },
];

/**
============================================================
Seed
============================================================ */
async function main() {
  /**
Permissions
*/
  console.log('Seeding permissions...');
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        description: permission.description,
      },

      create: {
        name: permission.name,
        description: permission.description,
      },
    });
  }

  /**
Roles + Permissions
*/
  console.log('Seeding roles...');
  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        description: roleData.description,
      },

      create: {
        name: roleData.name,
        description: roleData.description,
      },
    });

    for (const permissionName of roleData.permissions) {
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
            roleId: role.id,
            permissionId: permission.id,
          },
        },

        update: {},

        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  /**
Users
*/
  console.log('Seeding users...');
  const rolesFromDatabase = await prisma.role.findMany({
    select: { id: true, name: true },
  });
  const roleMap = new Map(rolesFromDatabase.map((role) => [role.name, role]));
  for (const userData of users) {
    const role = roleMap.get(userData.role);
    if (!role) {
      throw new Error(`Role "${userData.role}" not found`);
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.upsert({
      where: {
        email: userData.email,
      },

      update: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: hashedPassword,
      },

      create: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
    });

    /**
     * --------------------------------------------------------
     * User → Role
     * --------------------------------------------------------
     */

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },

      update: {},

      create: {
        userId: user.id,
        roleId: role.id,
      },
    });

    /**
     * --------------------------------------------------------
     * Driver Profile
     * --------------------------------------------------------
     */

    if (
      userData.role === 'driver' &&
      userData.licenseNumber &&
      userData.driverStatus
    ) {
      await prisma.driver.upsert({
        where: {
          userId: user.id,
        },

        update: {
          licenseNumber: userData.licenseNumber,

          status: userData.driverStatus,
        },

        create: {
          userId: user.id,

          licenseNumber: userData.licenseNumber,

          status: userData.driverStatus,
        },
      });
    }
  }

  /**
Summary
*/
  const [userCount, driverCount, roleCount, permissionCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.driver.count(),
      prisma.role.count(),
      prisma.permission.count(),
    ]);
  console.log('');
  console.log('Authorization and development seed completed successfully.');
  console.log('');
  console.log(`Users: ${userCount}`);
  console.log(`Drivers: ${driverCount}`);
  console.log(`Roles: ${roleCount}`);
  console.log(` Permissions: ${permissionCount}`);
  console.log('');
  console.log('Development password for all seeded users: FleetOps@123');
}

/**
============================================================
Execute
============================================================ */
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
