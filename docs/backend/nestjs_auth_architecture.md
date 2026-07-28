# NestJS Architecture: The Auth Module Foundation

This guide explains how the Authentication module is implemented technically in **NestJS**. NestJS is heavily inspired by Angular, utilizing **Decorators**, **Dependency Injection**, and strong **Typing (TypeScript)**. 

If you are learning the framework, the Auth module serves as a perfect foundational blueprint for how every feature in a NestJS backend is structured.

---

## 1. Controllers (The Traffic Directors)
**File:** [auth.controller.ts](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/auth.controller.ts)

Controllers are responsible for handling incoming HTTP requests and returning responses.
- We use the `@Controller('auth')` decorator to tell NestJS that this class handles any route starting with `/auth`.
- Inside, we use method decorators like `@Post('login')` to map specific API endpoints to functions.
- **Rule of Thumb**: The controller contains **no business logic**. Its only job is to receive the request data and immediately pass it to the Service layer.

---

## 2. DTOs (Data Transfer Objects)
**Files:** `dto/login.dto.ts`, `dto/register-user.dto.ts`

When the controller receives a request body (using the `@Body()` decorator), it maps it to a DTO class.
- DTOs define exactly what shape the incoming data must be (e.g., "email must be a string", "password must be at least 6 characters").
- NestJS uses a built-in `ValidationPipe` to automatically validate the request against this DTO before it even reaches your controller function. If the data is invalid, it automatically throws a `400 Bad Request`.

---

## 3. Services (The Brains / Business Logic)
**File:** [auth.service.ts](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/auth.service.ts)

Services are decorated with `@Injectable()`. This is where the actual heavy lifting happens.
- When `auth.controller.ts` calls `this.authService.login(...)`, the service takes over.
- The service contains the logic to verify passwords, query Firestore, generate JWT tokens, and handle exceptions (like throwing an `UnauthorizedException` if a password is wrong).

---

## 4. Dependency Injection (DI)
If you look at the constructor in `auth.service.ts`, you will see:
```typescript
constructor(
  private readonly usersService: UsersService,
  private readonly parentsService: ParentsService,
) {}
```
This is **Dependency Injection**. Instead of manually creating new instances of these services (e.g., `new UsersService()`), NestJS automatically provides ("injects") them into the Auth Service when the app starts. 

This allows the Auth module to seamlessly "delegate" tasks—like creating a Parent profile—to the `ParentsService` without having to rewrite database code.

---

## 5. Guards (The Bouncers)
**File:** [roles.guard.ts](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/roles.guard.ts)

In traditional Express/Node.js apps, you use "middleware" to check if a user is authorized. In NestJS, we use **Guards**.
- A Guard implements the `CanActivate` interface.
- It intercepts a route. When a request comes in, the Guard runs first. It checks the token, looks up the user's role in Firestore, and returns `true` (let them in) or throws a `ForbiddenException` (block them).

---

## 6. Custom Decorators (The Tags)
**File:** [roles.decorator.ts](file:///home/sonavin/Code/PPVS_Online_Classroom_Management_System/backend/src/modules/auth/roles.decorator.ts)

To tell the Guard *who* is allowed into a route, we created a custom `@Roles()` decorator.
- If you put `@Roles('admin', 'teacher')` above a Controller endpoint, you are attaching "metadata" to that route.
- The `RolesGuard` reads that metadata, compares it to the incoming user's role, and enforces the rule.

---

## Summary of the Data Flow
When a user tries to log in, the technical flow is:
1. HTTP POST Request arrives at `auth.controller.ts`.
2. The `LoginDto` validates the incoming JSON data.
3. The controller delegates the request to `auth.service.ts`.
4. The service uses injected dependencies (`UsersService`) to query Firestore.
5. The service returns a valid JWT token.
6. The controller sends the HTTP 200 OK response back to the client.

This pattern **(Controller -> DTO -> Service -> Dependency Injection)** is exactly how every module in NestJS is built!
