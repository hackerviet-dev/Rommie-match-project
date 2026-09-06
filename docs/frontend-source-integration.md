# Frontend source integration

Imported the product updates from `rommiematch-main.zip` into
`frontend/web-app/rommie-match`, adapting TanStack file routes to the existing
React Router application.

## Included

- Free, monthly Premium (20,000 VND), and annual Premium (180,000 VND) pricing
  on the landing and Premium pages. Corrected the monthly CTA label.
- Seven-frame mascot greeting and mascot avatar in a global assistant chatbox.
  Greetings pause between cycles; reduced-motion preferences are respected.
  The chatbox supports keyboard dismissal and fits small viewports.
- Community guidelines page and navigation links.
- Saved profiles in profile details, matching cards, and Settings. Bookmarks
  persist in localStorage and synchronize across tabs.
- Report form with validation. It explicitly states that submission/blocking
  is not connected; it does not show a fabricated success or report ID.
- Notification popover with sample notifications.
- Registration preferences and location selection, preserving the existing
  auth store and registration navigation.
- Required-field validation and conditional room details/amenities during
  onboarding, plus interactive service category filtering.

## Existing behavior preserved

React Router, Motion, the app logo, auth/logout handling, and the existing
PostgreSQL, .NET/Go, Docker and CI configuration are retained. The ZIP's
Lovable/TanStack runtime configuration and telemetry were not imported.

## Integration boundaries

This source provides frontend demonstrations, not production integrations.
Assistant replies are keyword-based, notifications are fixtures, and Premium
buttons do not process payments. Onboarding/profile forms are local UI state;
bookmarks use browser storage, not PostgreSQL. Report submission and server-side
blocking still require backend endpoints. The ZIP lacks the live website's
separate chat-avatar image, so `mascot-frame-middle.png` is used as the avatar.

## Verification

- Vite production build, TypeScript no-emit check and ESLint.
- Browser checks: pricing navigation, mascot images, assistant pricing reply,
  Escape dismissal, bookmark save/reload/remove, service filtering, community
  route, registration/onboarding required fields, mobile chat bounds and
  reduced-motion behavior.
