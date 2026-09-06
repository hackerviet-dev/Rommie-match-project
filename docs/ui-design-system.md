# RoomieMatch UI design direction

Applied guidance from [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
and its public style/UX reference. This is an application-specific design adaptation,
not an installed runtime dependency or a copy of the upstream skill.

## Direction

Light lifestyle interface: mint-tinted backgrounds, white surfaces, gentle depth,
navy primary actions and restrained teal accents. Preserve Plus Jakarta Sans / Inter,
Lucide icons and the RoomieMatch mascot. Use glass only for navigation overlays.

## Shared rules

- Navy `#0B3B6E`, action teal `#087F8C`, mint `#8FD3C1`, background `#F5F9F8`.
- Teal is dark enough for normal white button text; mint is decorative, not white-text fill.
- Brand gradients end in dark teal so white text remains readable.
- Standard buttons and icon buttons: 44px; large buttons: 48px. Explicit compact
  component overrides still need review when creating new pages.
- Inputs use 16px text, visible borders, 44px height and an offset focus ring.
- Cards use a shared soft shadow. Static cards do not move on hover.
- Desktop navigation begins at 1024px; smaller screens use drawer/bottom navigation.
- Active navigation exposes `aria-current`. Icon-only navigation controls have labels.
- Preserve keyboard focus, skip navigation, safe-area insets and reduced-motion behavior.
- The existing explicitly requested mascot greeting remains active; this update does
  not change its animation policy. Background floating respects reduced motion.

## Scope

Applied to responsive web: shared CSS/components, landing hero and app shell.
Native React Native screens have not been redesigned in this pass.
No backend contracts, pricing, or authentication behavior changes.
