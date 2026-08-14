// Ascending tier order — every role gate in the app is really "this tier and
// everything above it," never a disjoint set, so a flat array is enough (no
// branching hierarchy to model). Mirrored in
// training-app-backend/utils/roles.ts — the two packages share no lib today,
// so this is duplicated on purpose. Keep both copies to just this array +
// function so they stay trivial to eyeball-verify in sync.
export const ROLE_HIERARCHY = ['trainer', 'supervisor', 'seniorSupervisor', 'admin'];

// e.g. rolesAtLeast('supervisor') -> ['supervisor', 'seniorSupervisor', 'admin']
export function rolesAtLeast(minRole) {
  return ROLE_HIERARCHY.slice(ROLE_HIERARCHY.indexOf(minRole));
}
