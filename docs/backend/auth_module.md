# Auth Module Documentation

This document provides a simple, easy-to-understand breakdown of how the Authentication (Auth) Module works in the PPVS Online Classroom Management System backend. 

## 1. Overview
The Auth Module is responsible for **three main things**:
1. **Logging Users In**: Verifying credentials (email/password, phone/PIN, or Google OAuth) and returning an access token.
2. **Registering New Users**: Allowing Parents and Students to publicly register their own accounts while strictly preventing unauthorized users from creating Teacher or Admin accounts.
3. **Protecting Routes (RBAC)**: Ensuring that only authorized users (based on their roles like `admin`, `teacher`, `student`, or `parent`) can access specific API endpoints.

---

## 2. Key Files to Track
Here is a quick map of the files that make this module work. Click on any file to view its code:

- **The Controller** (The Entry Point): [auth.controller.ts](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/auth.controller.ts) - Defines the API routes (`/auth/login`, `/auth/register-parent`, etc.).
- **The Service** (The Brains): [auth.service.ts](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/auth.service.ts) - Contains the actual business logic for verifying passwords, creating users, and generating tokens.
- **The Roles Guard** (The Bouncer): [roles.guard.ts](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/roles.guard.ts) - Automatically checks every incoming request to see if the user's role is allowed to access the endpoint.
- **The Decorator** (The Tag): [roles.decorator.ts](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/roles.decorator.ts) - A custom `@Roles('admin', 'teacher')` tag placed on routes to tell the Roles Guard who is allowed in.

---

## 3. How Login Works

When a user tries to log in, they send a request to `POST /auth/login` or `POST /auth/login-google`.

### Standard Login (Email or Phone)
1. The request hits the `login` function in the controller: [auth.controller.ts:L14-L21](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/auth.controller.ts#L14-L21).
2. It is passed to the service: [auth.service.ts:L26](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/auth.service.ts#L26).
3. The service checks the `loginType`:
   - **Email Login**: It looks up the user using `UsersService.findByEmail`.
   - **Phone Login**: It looks up the user using `UsersService.findByPhoneNumber` and checks if the PIN matches.
4. If successful, it returns a JWT `accessToken` and the user's profile data.

### Google SSO Login
1. The user sends a Google ID Token to `POST /auth/login-google`.
2. The logic is handled here: [auth.service.ts:L86](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/auth.service.ts#L86).
3. The backend talks to Google's servers (`firebase-admin/auth`) to verify the token is real and belongs to a real email address.
4. It then looks up that email in our database. If they exist, they are logged in!

---

## 4. How Registration Works

Public users (Parents and Students) can create their own accounts via the app. However, we have strict rules to prevent people from making fake Teacher or Admin accounts.

1. A parent hits `POST /auth/register-parent` ([auth.controller.ts:L35-L41](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/auth.controller.ts#L35-L41)).
2. The controller passes the request to `registerPublicUser` in the service: [auth.service.ts:L229](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/auth.service.ts#L229).
3. **Security Check**: The code immediately checks if the requested role is `teacher` or `admin`. If it is, it throws a `ForbiddenException` and stops the process ([auth.service.ts:L231-L235](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/auth.service.ts#L231-L235)).
4. **Delegation**: The Auth module doesn't save the data directly to the database. Instead, it *delegates* the work to the correct department:
   - If it's a student, it calls `StudentsService.create()`.
   - If it's a parent, it calls `ParentsService.createOrUpdateProfile()`.
5. **Audit Logging**: Finally, it records an immutable audit log saying a new user was created.

---

## 5. How Role-Based Access Control (RBAC) Works

Once a user is logged in, they receive a token. Every time they make a request (like viewing attendance), we must check if they are allowed.

This is handled by the **RolesGuard**: [roles.guard.ts](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/roles.guard.ts)

1. The guard intercepts the request and looks at the `@Roles()` decorator on the route to see what roles are required ([roles.guard.ts:L19-L22](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/roles.guard.ts#L19-L22)).
2. It extracts the authenticated user from the request.
3. It checks the user's role:
   - First, it checks if the role is already cached in the user's token.
   - If not, it safely fetches the user's latest role from the Firestore `users` collection ([roles.guard.ts:L42-L55](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/roles.guard.ts#L42-L55)).
4. If the user's role matches the required roles, they are let through. If not, they are blocked with a `ForbiddenException` ([roles.guard.ts:L57-L61](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/roles.guard.ts#L57-L61)).

### Example Usage
Here is how it is used in a Controller (e.g., ClassesController):
```typescript
@Get()
@Roles('admin', 'teacher') // Only Admins and Teachers can trigger this route!
async findAll() {
  return this.classesService.findAll();
}
```
