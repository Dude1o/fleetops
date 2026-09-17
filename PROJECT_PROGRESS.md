# FleetOps Backend — Project Progress Report

> Generated: 2026-09-17
> Branch: `main` (clean)
> Root: `E:\Projects\fleetops\backend`
> Stack: NestJS 12 + TypeScript 6 + Prisma 7.10 + PostgreSQL (PostGIS 17-3.5) + Redis 7 + JWT + bcrypt

## 1. Overview

FleetOps backend is a NestJS modular monolith for fleet/dispatch management:
identity (users) → RBAC (roles/permissions) → fleet (drivers + PostGIS location) → dispatch (jobs lifecycle with concurrent claim protection).

Working end-to-end today:
- `POST /users` → `POST /auth/login` (JWT) → guarded routes via `JwtAuthGuard + PermissionsGuard`
- Driver onboarding + status/location tracking + `GET /drivers/nearby` radius search
- Full job lifecycle: `create → available (cached) → assign/claim (transactional + Redis lock) → pickup → in_transit → delivered`, plus `cancel/release` with driver freeing
- `GET /jobs/:id/nearby-drivers` (drivers near job pickup)
- Infra: `docker-compose` (api + postgis + redis), `GET /health/db`, seed for 3 roles / 11 permissions / 15 users / 5 drivers

## 2. Tech Stack (from `package.json`)

- Core: `@nestjs/common,core,platform-express,config,jwt,passport 12.x`, `passport,passport-jwt`, `reflect-metadata,rxjs`
- Data: `@prisma/client 7.10`, `@prisma/adapter-pg`, `pg`, `prisma 7.10` (dev)
- Infra: `redis 6.2.1`, `axios`, `dotenv`
- Validation: `class-validator,class-transformer,joi`
- Auth/security: `bcrypt 6`, `ms`
- Dev/test: `@nestjs/cli,schematics,testing,mau`, `jest 30,ts-jest,supertest,cross-env`, `oxlint`, `prettier`, `tsx,ts-node,ts-loader,typescript 6`
- Scripts: `build=nest build`, `start:dev=nest start --watch`, `db:seed=tsx prisma/seed/authorization.seed.ts`, `lint=oxlint src/ test/`, `test=jest`, `test:e2e=jest --config ./test/jest-e2e.json`

## 3. Architecture

```
src/
  main.ts                  # ValidationPipe whitelist+forbidNonWhitelisted+transform, port from Config
  app.module.ts            # Config(global)+Prisma(global)+Redis(global)+Health,Users,Auth,Permissions,Roles,Drivers,Jobs
  config/configuration.ts  # nodeEnv,port,DATABASE_URL,jwt{secret,expiresIn:15m}
  config/validation.ts     # Joi: NODE_ENV,PORT,DATABASE_URL(required pg regex),JWT_SECRET(min32 required),JWT_EXPIRES_IN
  database/prisma/         # Global PrismaModule, PrismaService extends PrismaClient + PrismaPg adapter, $connect/$disconnect
  common/
    decorstors/            # RequirePermissions(...names) SetMetadata, CurrentUser() -> request.user (both have typos in folder/name)
    guards/PermissionsGuard.ts # allow if no metadata, else load user+roles+permissions via UsersService, require ALL
    types/authenticated-user.ts # {userId,email}
    types/express.d.ts     # Express.User extends AuthenticatedUser
    redis/redis.service.ts # node-redis v4 wrapper: get/set/del/setIfNotExists(NX+EX)/eval
    redis/redis-lock.service.ts # acquire(key,ttlMs)->token|null via SET NX EX, release via Lua check-and-del
  modules/
    auth/                  # POST /auth/login only
    users/                 # POST /, GET /me, POST+GET /:userId/roles
    roles/                 # service-only, no controller
    permissions/           # service-only
    drivers/               # CRUD + status + location + nearby
    jobs/                  # full dispatch API (12 routes)
  health/                  # GET /health/db -> SELECT 1
  generated/prisma/        # Prisma Client output (do-not-edit)
```

No global `APP_GUARD/APP_FILTER/APP_INTERCEPTOR`, no `cors,helmet,swagger,versioning,rate-limit` in `main.ts`.

## 4. Data Model (`prisma/schema.prisma`, 176 lines, provider `postgresql`)

| Model | Fields | Relations / Notes |
|---|---|---|
| `User` | `id uuid, email unique, password, firstName,lastName, createdAt,updatedAt` | `roles:UserRole[]`, `driver:Driver?` 1-1 |
| `Role` | `id,name unique,description?,createdAt,updatedAt` | `users:UserRole[]`, `permissions:RolePermission[]` |
| `Permission` | `id,name unique,description?,createdAt,updatedAt` | `roles:RolePermission[]` |
| `UserRole` | `userId,roleId,assignedAt`, PK `[userId,roleId]` | both `Cascade`, `@@index([roleId])` |
| `RolePermission` | `roleId,permissionId,assignedAt`, PK `[roleId,permissionId]` | both `Cascade`, `@@index([permissionId])` |
| `Job` | `id uuid, status PENDING default, priority NORMAL default, customerName,Phone,pickupAddress,pickupLatitude Decimal(10,7) required, pickupLongitude required, deliveryAddress,notes?,createdAt,updatedAt` | `assignments:JobAssignment[]`, indexes `[status],[priority],[createdAt]` |
| `JobAssignment` | `id uuid,jobId,driverId,assignedAt,claimedAt?,completedAt?` | `job Cascade`, `driver Restrict`, indexes `[jobId],[driverId]` |
| `Driver` | `id uuid,userId unique,status OFFLINE default,licenseNumber unique,createdAt,updatedAt` | `user Restrict`, `assignments[]`, `location:DriverLocation?`, index `[status]` |
| `DriverLocation` | `id uuid,driverId unique,latitude,longitude Decimal(10,7),location geography(Point,4326)?,updatedAt` | `driver Cascade`, index `[lat,lng]` (plain, GIST missing) |

Enums:
- `JobStatus: PENDING,AVAILABLE,ASSIGNED,PICKED_UP,IN_TRANSIT,DELIVERED,CANCELLED`
- `JobPriority: LOW,NORMAL,HIGH,URGENT`
- `DriverStatus: OFFLINE,AVAILABLE,BUSY,SUSPENDED`

## 5. Migrations (`prisma/migrations/`, lock `postgresql`)

1. `20260907151358_init` — `User` + unique email
2. `20260908102020_add_roles_and_permissions` — `Role,Permission,UserRole,RolePermission` + uniques + 4x Cascade FKs
3. `20260908130424_add_fleet_domain` — `Job,JobAssignment,Driver` + 3 enums, indexes, `Assignment->Job Cascade`, `Assignment->Driver Restrict`, `Driver->User Restrict`
4. `20260912094956_add_driver_location` — `DriverLocation` + lat/lng index + `Cascade` to Driver
5. `20260912095418_add_driver_location_spatial` — `CREATE EXTENSION postgis`, `location geography(Point,4326)`
6. `20260913080831_add_driver_location_gist_index` — **empty** (`-- This is an empty migration.`), GIST not created
7. `20260913112606_add_job_pickup_location` — `Job.pickupLat/Lng nullable`
8. `20260913114607_make_job_pickup_location_required` — `SET NOT NULL` (warns on existing NULLs)

`prisma7.config.ts`: shadow DB `CREATE EXTENSION postgis`, `experimental.externalTables:true`.

## 6. Modules — Detailed Status

### 6.1 Auth (`src/modules/auth/`) — DONE (login only)
- `POST /auth/login {email,password(8-100)} -> {accessToken}`: `findByEmail`, `bcrypt.compare`, `Unauthorized('Invalid credentials')`, `jwt.sign({sub:id,email})`
- `JwtStrategy`: bearer only, `secretOrKey=jwt.secret`, `validate->{userId:sub,email}`
- `JwtAuthGuard extends AuthGuard('jwt')`
- Missing: refresh/logout/register/me, password reset

### 6.2 Users (`src/modules/users/`) — DONE core
- `POST /users` **public**: `CreateUserDto{email,password8-100,firstName2-50,lastName2-50}`, duplicate→`Conflict`, `bcrypt.hash(10)`, strips password in response
- `GET /users/me` `Jwt+RequirePermissions(jobs:read)`: echoes `@CurrentUser()`
- `POST /users/:userId/roles` `Jwt+users:update`: `AssignRoleDto{role 2-50}`
- `GET /users/:userId/roles` `Jwt+users:read` → `{userId,roles:[{name,permissions:string[]}]}` via nested include
- `UsersRepository`: `findByid (lowercase d),findByEmail,create,findByIdWithRoles(include roles->role->permissions->permission)`
- Bug: `assignRole` throws raw `Error('User not found')` not HTTP exception

### 6.3 Roles / Permissions — DONE service-only, no HTTP
- `RolesService`: `findByName`, `assignRoleToUser` (NotFound if role miss, `P2002→Conflict already assigned`)
- `PermissionsService`: `findByName,findByNames,createPermission`
- No controller/DTO; assignment via `UsersController` + seed

### 6.4 Drivers (`src/modules/drivers/`) — DONE + PostGIS
- `POST /drivers` **public**: `CreateDriverDto{userId UUID,licenseNumber 3-50}`, checks user exists, `Conflict` if user already driver or license dup
- `GET /drivers/nearby?lat&lng&radius?=5000 (100-50000)` `drivers:read`: `ST_Distance/ST_DWithin`, `status=AVAILABLE`, `ORDER BY distanceMeters`
- `GET /drivers/:id` `drivers:read` (404 msg says `User not found` — copy-paste bug)
- `PATCH /drivers/:id/status {status:DriverStatus}` `drivers:update`: idempotent if same, else `DRIVER_STATUS_TRANSITIONS` else `BadRequest`
- `PATCH /drivers/:id/location {latitude,longitude}` `drivers:update`: raw `INSERT ... ST_SetSRID(ST_MakePoint(lon,lat),4326)::geography ON CONFLICT(driverId) DO UPDATE`
- State machine: `OFFLINE->[AVAILABLE], AVAILABLE->[BUSY,OFFLINE], BUSY->[AVAILABLE,OFFLINE], SUSPENDED->[]` (terminal, no exit)
- `nearby` defined before `:id` (no shadow) — correct

### 6.5 Jobs (`src/modules/jobs/`, 364-line service) — DONE, most mature
| Method | Route + Perm | Logic |
|---|---|---|
| `createJob` | `POST /jobs` `jobs:create` | passthrough + `CreateJobDto{customerName2-100,phone5-30,pickupAddress5-500,pickupLat/Lng,deliveryAddress5-100,notes?1000,priority?}` |
| `findAvailableJobs` | `GET /jobs/available` `jobs:read` | Redis `jobs:available` 30s `JSON`, else `findAvailableJobs ORDER priority desc,createdAt asc` |
| `findById` | `GET /jobs/:id` `jobs:read` | +404 |
| `updateStatus` | `PATCH /jobs/:id/status` `jobs:assign` | `validateTransition` + update + `del(jobs:available)` |
| `assignJob` | `POST /jobs/:id/assign {driverId UUID}` `jobs:assign` | `$transaction` + `SELECT FOR UPDATE` job+driver, `->ASSIGNED`, driver must be `AVAILABLE`, `createAssignment`, `job ASSIGNED`, `driver BUSY`, invalidate cache |
| `claimJob` | `POST /jobs/:id/claim` `jobs:claim` | Redis lock `jobs:claim:{id}` 10s (`Conflict` if contended) → same tx but `findDriverByUserIdForUpdate` + `claimedAt=now`, `finally release` |
| `pickup` | `POST /jobs/:id/pickup` `jobs:claim` | tx `ASSIGNED->PICKED_UP`, verify active `findAssignmentByJobAndUser` else `BadRequest(not assigned)` |
| `startTransit` | `POST /jobs/:id/start-transit` `jobs:claim` | tx `PICKED_UP->IN_TRANSIT`, same assignment check |
| `deliver` | `POST /jobs/:id/deliver` `jobs:claim` | tx `IN_TRANSIT->DELIVERED`, `completeAssignment(completedAt)`, `driver AVAILABLE` |
| `cancel` | `POST /jobs/:id/cancel` `jobs:assign` | tx `->CANCELLED` (except terminal), complete active assignment if any + free driver, returns `{jobId,status,cancelledAssignmentId,driverId}` |
| `release` | `POST /jobs/:id/release` `jobs:assign` | only `ASSIGNED->AVAILABLE`, complete assignment, `driver AVAILABLE` |
| `nearby-drivers` | `GET /jobs/:id/nearby-drivers?radius=5000` `drivers:read` | PostGIS join `Job+DriverLocation+Driver` on `ST_DWithin(pickup,driverLoc,radius)` + `AVAILABLE` |

State machine (`job-status-transitions.ts`): `PENDING->[AVAILABLE,CANCELLED], AVAILABLE->[ASSIGNED,CANCELLED], ASSIGNED->[PICKED_UP,CANCELLED], PICKED_UP->[IN_TRANSIT,CANCELLED], IN_TRANSIT->[DELIVERED], DELIVERED->[],CANCELLED->[]`, no-op if same.
Repository uses `$queryRaw ... FOR UPDATE`, `ST_DWithin`, `SELECT FOR UPDATE` helpers.

### 6.6 Health — PARTIAL
- `GET /health/db -> prisma.$queryRaw SELECT 1 -> {database:'up'}` (500 on fail, no `DOWN` payload, typo `checkDatabse` still works)
- Missing: terminus, readiness/liveness split, Redis check

### 6.7 Common / Cross-cutting — DONE foundation
- Global `ValidationPipe{whitelist,forbidNonWhitelisted,transform}` (strict DTOs + query coercion)
- `RequirePermissions` + `PermissionsGuard` (DB lookup per request, require ALL, allow if no metadata)
- `CurrentUser`, `AuthenticatedUser`, `express.d.ts`
- `PrismaModule/Global`, `RedisModule/Global`, Joi validation fail-fast on boot
- Gap: `REDIS_URL` used but not Joi-validated; `PermissionsGuard` no cache; no logging/transform/filter interceptors

## 7. Seed (`prisma/seed/authorization.seed.ts`, `npm run db:seed`, idempotent upserts, `bcrypt 12`)

- 11 permissions: `users:read/create/update/delete`, `drivers:read/create/update`, `jobs:read/create/assign/claim`
- 3 roles: `admin(all 11)`, `dispatcher(jobs:read,create,assign + drivers:read)`, `driver(jobs:read,claim)`
- 15 users (`FleetOps@123` dev only): 5 admin (`oliver.bennett,sophia.mitchell,daniel.carter,emma.thompson,liam.anderson`), 5 dispatcher (`james.wilson,ava.martin,noah.harris,mia.clark,ethan.lewis`), 5 driver+profile (`michael.walker DRV-10001 AVAILABLE`, `isabella.hall DRV-10002 BUSY`, `benjamin.young DRV-10003 OFFLINE`, `charlotte.king DRV-10004 AVAILABLE`, `alexander.wright DRV-10005 OFFLINE`) all `@fleetops.local`
- No job/location seed

## 8. Infra (`docker-compose.yml`, `Dockerfile`, `.env` keys only)

- `api`: build `.`, `3000:3000`, `env_file:.env`, `DATABASE_URL=postgres://...@postgres:5432/fleetops`, `REDIS_URL=redis://redis:6379`, `depends_on postgres healthy` (no redis dep, no restart)
- `postgres`: `postgis/postgis:17-3.5`, `fleetops/fleetops`, `5432:5432`, `postgres_data`, `pg_isready` healthcheck 5s x5
- `redis`: `redis:7-alpine`, `fleetops-redis`, `unless-stopped`, `6379:6379`, `redis_data`, `--appendonly yes`
- `Dockerfile`: `node:24-alpine`, `npm ci`, `COPY .`, `npm run build`, `EXPOSE 3000`, `node dist/main.js` (no multistage, non-root, prisma generate/migrate)
- Env keys: `NODE_ENV,PORT,DATABASE_URL,JWT_SECRET,JWT_EXPIRES_IN,REDIS_URL,CLAIM_RACE_JOB_ID,CLAIM_RACE_TOKEN_1,CLAIM_RACE_TOKEN_2` (no `.env.example`)

## 9. Tests & Scripts

- Unit: 14 `*.spec.ts` — 13x `should be defined` only, `jobs.service.spec.ts` has real intent (mock repo+prisma, findById success/NotFound) but nested inside outer `it` so never runs → effectively 0% coverage. No jest thresholds in `package.json`.
- e2e: `test/app.e2e-spec.ts` only `GET / Hello World!`
- Manual: `scripts/claim-race.ts` (2 parallel `POST /jobs/:id/claim`, expect 1 success +1 409), `scripts/redis-lock-test.ts` (acquire→2nd null→release→re-acquire)
- `lint: oxlint src/ test/`

## 10. Git History (oldest → newest, `main`)

```
037d177 chore: configure prisma with postgresql (09-07)
fb889a3 feat: integrate prisma and database health check
f603781 choret: add postgres healthceck
f83fcce refactor: organize application architecture
5bfa723 feat: implement user creation flow
22f7bb8 feat: implement authentication foundation
2cb5443 feat: implement authorization foundation
c496792 feat: add role management APIs
3d79485 feat: implement concurrent job claiming
f1b0f9b+efca66a feat: complete job lifecycle and concurrency handling
a4951fb feat: add redis caching for available jobs
5a596cc refactor: centralize job status transitions
321165b feat: add driver location model
649c510 feat: add distributed lock service
055cc4f feat: protect job claims with distributed lock
5acddac feat: add pickup coordinates (latest, 09-13)
```

Trajectory: DB → health → arch → users → auth → RBAC → fleet → jobs concurrency → cache → lock → geo.

## 11. Gaps / Risks / Next

1. Public `POST /users`, `POST /drivers` (no guards) — lock down or rate-limit
2. `REDIS_URL` not Joi-validated; `Dockerfile` no migrate/generate; api no redis `depends_on`
3. Empty GIST migration — add `USING GIST(location)` for scale
4. `PermissionsGuard` per-request DB — cache in Redis
5. Raw `Error` in `UsersService.assignRole`, wrong 404 msg in Drivers, typos `decorstors`, `user-roles-response.to.ts`, `checkDatabse`
6. `SUSPENDED`, `DELIVERED/CANCELLED` terminal with no reopen path — confirm intentional
7. No pagination on `available`, no Swagger/CORS/helmet/rate-limit, health Redis missing
8. Tests: fix `jobs.service.spec.ts` nesting, add real service+concurrency tests, update e2e beyond Hello World
9. Missing job/location seed for local dev

## 12. How to Run (known good)

```bash
npm install
# .env needs NODE_ENV,PORT,DATABASE_URL,JWT_SECRET,JWT_EXPIRES_IN,REDIS_URL
docker compose up -d postgres redis  # postgis + redis:7-alpine
npx prisma migrate dev
npm run db:seed
npm run start:dev  # :3000, strict ValidationPipe
```
