# API Specification

Base URL: `/api/v1`

## Authentication

All protected endpoints require `Authorization: Bearer <access_token>` header.

Admin endpoints require user role = `admin`.

---

## Auth Endpoints

### POST /auth/register
Register new user with email/password.

**Request:**
```json
{
  "email": "user@school.org",
  "password": "SecureP@ss123",
  "name": "María García"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@school.org",
    "name": "María García",
    "role": "user",
    "phoneNumber": null,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "accessToken": "eyJ...",
  "expiresIn": 900
}
```

**Errors:**
- `400`: Validation error (weak password, invalid email)
- `409`: Email already registered

---

### POST /auth/login
Login with email/password.

**Request:**
```json
{
  "email": "user@school.org",
  "password": "SecureP@ss123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@school.org",
    "name": "María García",
    "role": "user",
    "phoneNumber": "+34612345678",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "accessToken": "eyJ...",
  "expiresIn": 900
}
```

*Note: Refresh token set as HTTP-only cookie `refresh_token`*

**Errors:**
- `401`: Invalid credentials

---

### GET /auth/google
Redirect to Google OAuth consent screen.

**Query Params:**
- `redirect`: Frontend callback URL (optional, defaults to configured URL)

---

### GET /auth/google/callback
Google OAuth callback (handled internally, redirects to frontend).

**Success redirect:** `{frontend_url}/auth/callback?token={access_token}`

**Error redirect:** `{frontend_url}/auth/callback?error={error_code}`

---

### POST /auth/refresh
Refresh access token using refresh token cookie.

**Response (200):**
```json
{
  "accessToken": "eyJ...",
  "expiresIn": 900
}
```

**Errors:**
- `401`: Invalid or expired refresh token

---

### POST /auth/logout
Invalidate refresh token.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## User Endpoints

### GET /me
Get current user profile.

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@school.org",
  "name": "María García",
  "role": "user",
  "authProvider": "google",
  "phoneNumber": "+34612345678",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T15:00:00Z"
}
```

---

### PATCH /me
Update current user profile.

**Request:**
```json
{
  "phoneNumber": "+34612345678"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@school.org",
  "name": "María García",
  "role": "user",
  "phoneNumber": "+34612345678",
  "updatedAt": "2024-01-20T15:00:00Z"
}
```

**Errors:**
- `400`: Invalid phone number format (must be E.164)

---

### GET /me/circles
Get circles the current user belongs to.

**Response (200):**
```json
{
  "circles": [
    {
      "id": "uuid",
      "name": "Infrastructure",
      "description": "Technical infrastructure and maintenance",
      "joinedAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "name": "General",
      "description": "General circle for school-wide decisions",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET /me/entries
Get current user's entries with filtering and pagination.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `from` | ISO date | Filter entries from this week start |
| `to` | ISO date | Filter entries until this week start |
| `circleId` | UUID | Filter by circle |
| `weekStart` | ISO date | Filter specific week |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 20, max: 100) |

**Response (200):**
```json
{
  "entries": [
    {
      "id": "uuid",
      "circleId": "uuid",
      "circleName": "Infrastructure",
      "weekStartDate": "2024-01-15",
      "hours": 1.5,
      "description": "Fixed networking issues",
      "zeroHoursReason": null,
      "createdAt": "2024-01-18T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 45,
    "totalPages": 3
  }
}
```

---

### POST /me/entries
Create a new hours entry.

**Request:**
```json
{
  "date": "2024-01-17",
  "circleId": "uuid",
  "hours": 1.5,
  "description": "Fixed networking issues in the library",
  "zeroHoursReason": null
}
```

*Note: `date` can be any date in the target week; server computes `weekStartDate`*

**Validation Rules:**
- `circleId`: Required, must be a circle user belongs to
- `hours`: Required, >= 0, max 2 decimal places
- `description`: Required, 1-2000 characters
- `zeroHoursReason`: Required if `hours = 0`, 1-500 characters

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "circleId": "uuid",
  "circleName": "Infrastructure",
  "weekStartDate": "2024-01-15",
  "hours": 1.5,
  "description": "Fixed networking issues in the library",
  "zeroHoursReason": null,
  "createdAt": "2024-01-18T14:30:00Z"
}
```

**Errors:**
- `400`: Validation error
- `403`: User not member of specified circle

---

### GET /me/summary
Get weekly summaries for user.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `weeks` | number | Number of weeks to include (default: 4, max: 52) |

**Response (200):**
```json
{
  "weeks": [
    {
      "weekStartDate": "2024-01-15",
      "weekEndDate": "2024-01-21",
      "totalHours": 2.5,
      "entryCount": 2,
      "status": "met",
      "byCircle": [
        { "circleId": "uuid", "circleName": "Infrastructure", "hours": 1.5 },
        { "circleId": "uuid", "circleName": "General", "hours": 1.0 }
      ]
    },
    {
      "weekStartDate": "2024-01-08",
      "weekEndDate": "2024-01-14",
      "totalHours": 0,
      "entryCount": 1,
      "status": "zero_reason",
      "byCircle": []
    }
  ],
  "target": 2,
  "periodTotalHours": 5.5
}
```

---

### GET /me/monthly-summary
Get monthly summary.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `month` | YYYY-MM | Month to summarize (default: current month) |

**Response (200):**
```json
{
  "month": "2024-01",
  "totalHours": 8.5,
  "weeklyTarget": 2,
  "weeksInMonth": 5,
  "expectedHours": 10,
  "status": "under_target",
  "byCircle": [
    { "circleId": "uuid", "circleName": "Infrastructure", "hours": 5.0 },
    { "circleId": "uuid", "circleName": "General", "hours": 3.5 }
  ],
  "weeklyBreakdown": [
    { "weekStartDate": "2024-01-01", "hours": 2.0, "status": "met" },
    { "weekStartDate": "2024-01-08", "hours": 2.5, "status": "met" },
    { "weekStartDate": "2024-01-15", "hours": 2.0, "status": "met" },
    { "weekStartDate": "2024-01-22", "hours": 1.5, "status": "under_target" },
    { "weekStartDate": "2024-01-29", "hours": 0.5, "status": "under_target" }
  ]
}
```

---

## Admin Endpoints

All admin endpoints require `role = admin`.

### GET /admin/dashboard
Get admin dashboard data.

**Response (200):**
```json
{
  "recentEntries": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "María García",
      "circleId": "uuid",
      "circleName": "Infrastructure",
      "weekStartDate": "2024-01-15",
      "hours": 1.5,
      "description": "Fixed networking issues",
      "createdAt": "2024-01-18T14:30:00Z"
    }
  ],
  "missingPreviousWeek": {
    "weekStartDate": "2024-01-08",
    "users": [
      {
        "id": "uuid",
        "name": "Carlos López",
        "email": "carlos@school.org",
        "phoneNumber": "+34612345679",
        "totalHours": 0,
        "status": "missing"
      }
    ],
    "count": 3
  },
  "missingTwoWeeks": {
    "weekStartDates": ["2024-01-01", "2024-01-08"],
    "users": [
      {
        "id": "uuid",
        "name": "Ana Martín",
        "email": "ana@school.org",
        "phoneNumber": null,
        "consecutiveMissingWeeks": 2
      }
    ],
    "count": 1
  },
  "statusCounts": {
    "missing": 3,
    "zeroReason": 1,
    "underTarget": 5,
    "met": 42
  },
  "circleMetrics": [
    {
      "circleId": "uuid",
      "circleName": "Infrastructure",
      "totalHours": 45.5,
      "activeMemberCount": 12,
      "avgHoursPerMember": 3.79,
      "contributingUsers": 10
    }
  ]
}
```

---

### GET /admin/users
List all users with search and pagination.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name or email |
| `role` | enum | Filter by role (user/admin) |
| `hasPhone` | boolean | Filter by phone presence |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 20) |

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "maria@school.org",
      "name": "María García",
      "role": "user",
      "phoneNumber": "+34612345678",
      "isActive": true,
      "circles": ["Infrastructure", "General"],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 51,
    "totalPages": 3
  }
}
```

---

### PATCH /admin/users/:id
Update user (admin only - phone number in MVP).

**Request:**
```json
{
  "phoneNumber": "+34612345678"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "maria@school.org",
  "name": "María García",
  "phoneNumber": "+34612345678",
  "updatedAt": "2024-01-20T15:00:00Z"
}
```

---

### GET /admin/circles
List all circles with metrics.

**Response (200):**
```json
{
  "circles": [
    {
      "id": "uuid",
      "name": "Infrastructure",
      "description": "Technical infrastructure and maintenance",
      "isActive": true,
      "memberCount": 12,
      "totalHoursThisMonth": 45.5,
      "avgHoursPerMember": 3.79,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET /admin/circles/:id
Get a single circle by ID.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Infrastructure",
  "description": "Technical infrastructure and maintenance",
  "isActive": true,
  "memberCount": 12,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Response (404):** Circle not found.

---

### GET /admin/circles/:id/members
List members of a circle.

**Response (200):**
```json
{
  "members": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "Jane Doe",
      "userEmail": "jane@example.org",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Response (404):** Circle not found.

---

### POST /admin/circles/:id/members
Add a user to the circle.

**Body:**
```json
{
  "userId": "uuid"
}
```

**Response (201):** `{ "success": true }`

**Response (404):** Circle or user not found.

**Response (409):** User is already a member.

---

### DELETE /admin/circles/:id/members/:userId
Remove a member from the circle (soft leave: membership is deactivated).

**Response (200):** `{ "success": true }`

**Response (404):** Membership not found.

---

### GET /admin/circles/:id/available-users
List users that can be added to the circle (active users not already in the circle).

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Optional: filter by name or email |

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.org"
    }
  ]
}
```

**Response (404):** Circle not found.

---

### GET /admin/entries
List all entries with filters.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `from` | ISO date | Filter from this week start |
| `to` | ISO date | Filter until this week start |
| `circleId` | UUID | Filter by circle |
| `userId` | UUID | Filter by user |
| `weekStart` | ISO date | Filter specific week |
| `page` | number | Page number |
| `pageSize` | number | Items per page |

**Response (200):** Same structure as `/me/entries` but includes all users.

---

### GET /admin/reports/csv
Download CSV report.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `from` | ISO date | Required: start date |
| `to` | ISO date | Required: end date |
| `circleId` | UUID | Optional: filter by circle |
| `userId` | UUID | Optional: filter by user |

**Response (200):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="hours-report-2024-01-01-2024-01-31.csv"

User ID,User Name,User Email,Circle,Week Start,Hours,Description,Zero Hours Reason,Created At
uuid,María García,maria@school.org,Infrastructure,2024-01-15,1.5,"Fixed networking",null,2024-01-18T14:30:00Z
```

---

### GET /admin/reminders/weekly
Get reminder targets for a specific week.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `weekStart` | ISO date | Week start date (default: previous week) |

**Response (200):**
```json
{
  "weekStartDate": "2024-01-08",
  "generatedAt": "2024-01-15T07:00:00Z",
  "targets": [
    {
      "userId": "uuid",
      "userName": "Carlos López",
      "userEmail": "carlos@school.org",
      "phoneNumber": "+34612345679",
      "status": "missing",
      "totalHours": 0
    },
    {
      "userId": "uuid",
      "userName": "Ana Martín",
      "userEmail": "ana@school.org",
      "phoneNumber": null,
      "status": "under_target",
      "totalHours": 1.5
    }
  ],
  "summary": {
    "missing": 3,
    "underTarget": 5,
    "total": 8
  }
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "phoneNumber",
      "message": "Phone number must be in E.164 format"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/v1/me"
}
```

## Rate Limiting

| Endpoint Pattern | Limit |
|-----------------|-------|
| `/auth/login` | 5 requests/minute per IP |
| `/auth/register` | 3 requests/minute per IP |
| `POST /me/entries` | 30 requests/minute per user |
| `/admin/*` | 100 requests/minute per user |
| Default | 60 requests/minute per user |
