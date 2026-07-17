# Backend API Documentation & RBAC Guide (`Swagger & @CurrentUser`)

This document explains **how the interactive Swagger API documentation (`/api-docs`) and our standardized `@CurrentUser()` RBAC decorator work** under the hood, and provides step-by-step instructions on **how to develop and test API endpoints** locally.

---

## Part 1: How It Works Under the Hood

### 1. The OpenAPI Setup (`src/main.ts`)
When the NestJS backend starts up (`bootstrap()` in `src/main.ts`), it configures the OpenAPI specification:
```typescript
const config = new DocumentBuilder()
  .setTitle('PPVS Online Classroom Management System API')
  .setDescription(
    'Full REST API specification for PPVS Online Classroom Management System with multi-role RBAC, KHR tuition billing, and custom attendance tracking.',
  )
  .setVersion('1.0')
  .addBearerAuth() // <--- Enables the green "Authorize" button in Swagger UI
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document); // <--- Mounts UI at http://localhost:3000/api-docs
```
- **`addBearerAuth()`**: Instructs Swagger UI to expect a `Bearer <JWT_TOKEN>` header for protected endpoints.
- **`SwaggerModule.setup('api-docs', app, document)`**: Serves the interactive web UI where you can inspect every route, request payload, and response format.

---

### 2. The `@CurrentUser()` Parameter Decorator (`src/modules/auth/current-user.decorator.ts`)
Every protected controller endpoint uses `FirebaseAuthGuard`. When a request comes in with a valid Firebase ID token, the guard verifies the token and attaches the decoded user data (`uid`, `role`, `email`, `name`) to `request.user`.

Instead of writing boilerplate `@Req() req: any` extraction in every controller, our `@CurrentUser()` decorator cleanly pulls this data and casts it to our strict TypeScript interface:
```typescript
export interface AuditUserContext extends AuditContext {
  email?: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuditUserContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuditUserContext;
  },
);
```

#### Why we import with `type AuditUserContext` inside controllers:
```typescript
import { CurrentUser, type AuditUserContext } from '../auth/current-user.decorator';
```
Because `emitDecoratorMetadata` and `isolatedModules` are enabled in `tsconfig.json`, TypeScript needs to know that `AuditUserContext` is purely a compile-time interface. Using the `type` modifier prevents TypeScript from trying to emit it as a runtime object (`TS1272`), while keeping 100% type safety for your controller code!

---

### 3. Controller Swagger Annotations
Every domain controller (`users`, `teachers`, `parents`, `students`, `classes`, `sessions`, `assessments`, `attendance`, `payments`, `notifications`, `enrollments`) is decorated with:
- **`@ApiTags('Module Name')`**: Groups the endpoints cleanly into categories inside the Swagger UI sidebar.
- **`@ApiBearerAuth()`**: Tells Swagger UI that calls to this controller must include the Bearer token configured via the **Authorize** button.
- **`@ApiOperation({ summary: '...' })`**: Provides a clear, human-readable summary for each endpoint.

---

## Part 2: How to Work With It (Testing & Development)

### Step 1: Start the Backend Development Server
Ensure you are inside the `backend/` directory and run the development server:
```bash
cd backend
npm run start:dev
```
Once the terminal displays `Nest application successfully started`, the API is live at `http://localhost:3000`.

---

### Step 2: Open the Interactive Swagger UI
Open your web browser and navigate to:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

You will see the interactive OpenAPI dashboard listing all 13 modules categorized cleanly.

---

### Step 3: Authenticate in Swagger UI (`@ApiBearerAuth`)
Because our endpoints are guarded by `FirebaseAuthGuard` and `RolesGuard`, trying to execute a request without authenticating will return a `401 Unauthorized` or `403 Forbidden` error.

#### How to authorize your requests in Swagger:
1. Obtain a **Firebase ID Token** for a test user (`admin`, `teacher`, `parent`, or `student`) from your frontend application (e.g., via `firebase.auth().currentUser.getIdToken()` or your login screen logs).
2. At the top right of the Swagger UI page, click the green **Authorize** (`🔒`) button.
3. In the Value box, paste your token string directly (or type `Bearer <your_token>`) and click **Authorize**.
4. Click **Close**. Now, every request you execute from Swagger UI will automatically attach `Authorization: Bearer <your_token>` in the HTTP header!

---

### Step 4: Execute & Test Endpoints Live
1. Click on any module category (e.g., **`Attendance`** or **`Payments & Invoices`**) to expand its endpoints.
2. Click on an endpoint row (e.g., `POST /attendance/check-in` or `POST /payments/create-invoice`).
3. Click the **Try it out** button on the right.
4. If the endpoint requires a JSON body (`@Body()`), Swagger UI will automatically display a pre-filled JSON template based on our DTO class (`BatchCheckInDto` or `CreateInvoiceDto`). You can edit the values right inside the text area!
5. Click the large blue **Execute** button.
6. Scroll down slightly to see the live server response, including the **HTTP Status Code** (`201 Created` or `200 OK`), response headers, and the JSON data returned directly from Firebase Firestore!

---

## Part 3: Adding New Endpoints or Modules in the Future

When you add a new endpoint or a new domain module in the future, follow these 3 simple rules to maintain consistency:

1. **Always annotate your Controller Class**:
   ```typescript
   @ApiTags('Your New Module')
   @ApiBearerAuth()
   @Controller('your-route')
   @UseGuards(FirebaseAuthGuard, RolesGuard)
   export class YourNewController { ... }
   ```
2. **Always annotate your Endpoint Methods**:
   ```typescript
   @Post()
   @Roles('admin', 'teacher')
   @ApiOperation({ summary: 'Brief explanation of what this endpoint does' })
   async createSomething(...) { ... }
   ```
3. **Always use `@CurrentUser()` with `type AuditUserContext`**:
   ```typescript
   import { CurrentUser, type AuditUserContext } from '../auth/current-user.decorator';

   // Inside your controller method:
   create(@Body() dto: CreateDto, @CurrentUser() user: AuditUserContext) {
     return this.service.create(dto, {
       uid: user.uid,
       role: user.role || 'user',
     });
   }
   ```
