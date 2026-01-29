I will fix the missing UI component and address the multi-framework requirement.

### 1. Fix Missing UI (Navigation)

The `ControlMappingsAdmin` component is currently orphaned (unused code). I will integrate it into the `FrameworksSettingsTab` component so it is accessible to users.

* **Action**: Modify `components/settings/FrameworksSettingsTab.tsx`.

* **Change**: Import `ControlMappingsAdmin` and render it below the existing "Compliance Frameworks" card. This will create a new section called "Cross-Framework Harmonization" within the existing Frameworks tab.

### 2. Address Multi-Framework Support

To handle the user's question "what happens when we have multiple frameworks", I will enhance the auto-mapping feature to support a "One-to-Many" mapping workflow.

* **Action**: Update `components/settings/ControlMappingsAdmin.tsx`.

* **Change**:

  1. Add a new mode to the "Target Framework" dropdown called **"All Frameworks"**.
  2. Update the `handleAutoMap` function to handle this case. If "All Frameworks" is selected, it will iterate through all available frameworks (except the source) and run the mapping process for each pair.
  3. This effectively creates a "Harmonize Library" button that ensures the selected source framework is linked to everything else.

### Implementation Steps

1. **Modify** **`components/settings/FrameworksSettingsTab.tsx`**: Add the `ControlMappingsAdmin` component.
2. **Modify** **`components/settings/ControlMappingsAdmin.tsx`**:

   * Add "All Frameworks" option to the target select.

   * Update logic to loop through frameworks if "All" is selected.

   * Update UI text to clearly explain that this handles multi-framework harmonization.

