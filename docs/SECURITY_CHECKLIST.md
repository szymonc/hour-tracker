# Security Checklist

## Authentication & Authorization

### Password Security
- [x] Passwords hashed with bcrypt (cost factor 12)
- [x] Password strength requirements enforced (8+ chars, uppercase, lowercase, number)
- [x] No plaintext password storage or logging
- [x] Secure password reset flow (if implemented)

### JWT Implementation
- [x] Short-lived access tokens (15 minutes)
- [x] Long-lived refresh tokens (7 days) in HTTP-only cookies
- [x] Separate secrets for access and refresh tokens
- [x] Token payload contains minimal claims (sub, email, role)
- [x] Token expiration validated on every request

### Session Security
- [x] Refresh tokens in HTTP-only cookies (prevents XSS theft)
- [x] Secure cookie flag in production
- [x] SameSite cookie attribute (strict in production)
- [x] Logout invalidates refresh token
- [x] No sensitive data in localStorage (only accessToken for API calls)

### OAuth Security
- [x] Google OAuth with proper scope restrictions (email, profile)
- [x] State parameter validation (CSRF protection in OAuth flow)
- [x] Callback URL validation
- [x] Account linking handled securely

## API Security

### Input Validation
- [x] class-validator for DTO validation
- [x] Whitelist validation (forbidNonWhitelisted)
- [x] Type coercion with explicit transforms
- [x] Max length limits on all string fields
- [x] E.164 phone number validation
- [x] UUID validation for IDs
- [x] Date format validation

### Rate Limiting
- [x] Global rate limiting (60 req/min default)
- [x] Stricter limits on auth endpoints:
  - Login: 5 req/min per IP
  - Register: 3 req/min per IP
- [x] Per-user rate limiting on sensitive operations

### Authorization
- [x] JWT guard on all protected endpoints
- [x] Role-based access control (user/admin)
- [x] Resource ownership validation (users can only access own data)
- [x] Admin-only endpoints properly guarded
- [x] Circle membership validation for entry creation

### Error Handling
- [x] Generic error messages (no sensitive info leakage)
- [x] Stack traces hidden in production
- [x] 5xx errors logged server-side
- [x] Consistent error response format

## Data Security

### Database
- [x] Parameterized queries (TypeORM)
- [x] No raw SQL with user input
- [x] Sensitive fields excluded from serialization (@Exclude)
- [x] Immutable entries (no edit/delete in MVP)
- [x] ON DELETE RESTRICT for entry references
- [x] Audit trail for admin actions

### Data Validation
- [x] Server-side weekStartDate computation
- [x] Zero-hours reason required when hours = 0
- [x] Database constraints match application validation

## HTTP Security

### Headers (via Helmet)
- [x] X-Frame-Options: SAMEORIGIN
- [x] X-Content-Type-Options: nosniff
- [x] X-XSS-Protection: 1; mode=block
- [x] Referrer-Policy: strict-origin-when-cross-origin
- [x] Content-Security-Policy (configure as needed)

### CORS
- [x] Strict origin validation
- [x] Credentials allowed only for specified origin
- [x] Allowed methods explicitly listed
- [x] Allowed headers explicitly listed

### Transport
- [x] HTTPS enforced in production
- [x] SSL termination at reverse proxy
- [x] Secure cookies require HTTPS

## Frontend Security

### XSS Prevention
- [x] Angular's built-in XSS protection (template sanitization)
- [x] No innerHTML with user content
- [x] Content-Security-Policy headers

### CSRF Protection
- [x] SameSite cookies (primary protection)
- [x] Refresh token in HTTP-only cookie
- [x] State parameter in OAuth flow

### Sensitive Data
- [x] No sensitive data in URL parameters
- [x] Access token in memory, not localStorage long-term
- [x] User session cleared on logout

## Infrastructure Security

### Docker
- [x] Non-root user in containers
- [x] Minimal base images (Alpine)
- [x] No secrets in Dockerfiles
- [x] Environment variables for configuration
- [x] Health checks configured

### Secrets Management
- [x] Environment variables for all secrets
- [x] .env.example without real values
- [x] .gitignore excludes .env files
- [x] Production secrets via secure secret management

### Logging
- [x] Structured logging
- [x] No sensitive data in logs
- [x] Request logging with masked sensitive fields
- [x] Error logging for debugging

## Deployment Security

### Environment
- [x] Separate development/production configurations
- [x] NODE_ENV=production in production
- [x] Debug mode disabled in production
- [x] Swagger/API docs disabled in production

### Updates
- [ ] Regular dependency updates
- [ ] Security advisories monitoring
- [ ] npm audit in CI/CD pipeline

## Future Considerations

### Telegram Integration
- [ ] Bot token stored securely
- [ ] User phone number verification
- [ ] Rate limiting on notifications
- [ ] Opt-out mechanism

### Additional Security
- [ ] Two-factor authentication
- [ ] Session management UI
- [ ] IP-based suspicious activity detection
- [ ] Audit log retention policy
- [ ] GDPR compliance (data export/deletion)
