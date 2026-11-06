export default {
  // Declare your Neon services here
  auth: false,
  // Branch policy: per-branch tuning
  branch: (branch: { isDefault: boolean; exists: boolean }) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
};

