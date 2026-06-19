# Story 5: Responsive layout — panels adapt to the device

## Description

As a person using this tool, I want the layout to work well on my phone, tablet,
or desktop, so that I can browse earthquakes comfortably on any screen without
panels crowding the map or blocking each other.

## Scope

- In: the filter panel and the cluster panel each adapt to the screen width so
  they remain usable without hiding the map; the map does not show duplicate
  worlds at low zoom (which frees the right edge for the cluster panel); on
  wide screens, clicking a cluster card keeps the panel visible alongside the
  popup so I can browse the list and see details at the same time.
- Out: year limits in filter validation → separate story; NavigationControl
  (zoom buttons) → separate UX story; message colours → separate UX story;
  dark mode / theming.
  No changes to fetching (Story 1), magnitude styling (Story 2), popup content
  (Story 3), or cluster logic (Story 4).

## Acceptance Criteria

### AC1 — The map shows one world, not duplicates

Given the map at any zoom level,
When I zoom out,
Then I see only one copy of the world, not multiple duplicates — the right edge
of the map is clean, not wrapping into a second world copy.

### AC2 — The cluster panel fits the screen on any device

Given the cluster panel is open,
When I am on a narrow screen (phone),
Then the panel fills the whole screen so I can read the list without scrolling
sideways.

When I am on a wide screen (desktop or landscape tablet),
Then the panel sits at the right edge of the map, tall enough to reach the bottom,
without hiding the earthquake markers.

### AC3 — The filter panel stays accessible without blocking the map

Given the filter panel,
When I am on a narrow screen (phone),
Then the filter is tucked away by default and I can open it with one tap — it
does not permanently occupy screen space.

When I am on a medium screen (tablet portrait) and the cluster panel is open,
Then the filter automatically hides so the two panels do not overlap. When I
close the cluster panel, the filter returns to its normal position.

When I am on a wide screen (desktop),
Then the filter is always visible in its top-left position — it never gets in
the way of the cluster panel or the map.

### AC4 — On wide screens, the cluster panel stays open when I click a card

Given the cluster panel is open on a wide screen,
When I click a card to see details,
Then the panel stays open — the popup appears on top of it — so I can keep
browsing the list while looking at one event's details.

When I am on a narrow or medium screen,
Then clicking a card closes the panel and opens the popup, just like today.

### AC5 — The map always fills the remaining space

Given any combination of open or closed panels,
When the layout adjusts,
Then the map fills whatever space is left — it is never pushed off-screen,
clipped, or reduced to a sliver.
