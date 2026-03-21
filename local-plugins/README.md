# Local Plugins Directory

This directory is for self-hosted ComplianceOS instances to add custom features without modifying the core codebase.

## Directory Structure

```
local-plugins/
├── plugins/
│   ├── custom-feature-1/
│   │   ├── manifest.json
│   │   ├── index.tsx          # React component
│   │   └── server.ts          # Optional server-side logic
│   └── another-feature/
│       └── ...
├── config.json                # Plugin configuration
└── README.md                  # This file
```

## How to Add a Custom Feature

1. Create a new folder in `plugins/`
2. Add a `manifest.json` with metadata
3. Add your React component in `index.tsx`
4. Optionally add server-side logic in `server.ts`
5. Enable the plugin in `config.json`
6. Set `SELFHOSTED_CUSTOM_PLUGINS_PATH=./local-plugins` in your environment

## manifest.json Schema

```json
{
  "name": "Custom Risk Dashboard",
  "slug": "custom-risk-dashboard",
  "version": "1.0.0",
  "description": "A custom risk visualization dashboard",
  "author": "Your Organization",
  "entryPoints": {
    "dashboard": "./index.tsx",
    "server": "./server.ts"
  },
  "permissions": ["read:risks", "write:risks"],
  "hooks": ["risk:dashboard", "menu:items"]
}
```

## Example: Adding a Custom Menu Item

In your manifest.json, add to hooks:
```json
"hooks": ["menu:items"]
```

Then in your index.tsx:
```tsx
import { useLocalPlugin } from '@/lib/local-plugins';

export function CustomMenuItem() {
  const { t } = useLocalPlugin();
  
  return {
    label: t('custom_menu_item', 'My Custom Feature'),
    path: '/custom-feature',
    icon: 'CustomIcon'
  };
}
```

## Security Notes

- Local plugins run with the same privileges as the main application
- Be careful with any custom server-side code
- Review any external dependencies you add
- Plugins can access all data in your self-hosted instance

## Loading Custom Plugins

Set these environment variables:

```bash
# Enable self-hosted mode
SELFHOSTED_FEATURES_ENABLED=1

# Point to local plugins directory (absolute or relative path)
SELFHOSTED_CUSTOM_PLUGINS_PATH=./local-plugins

# Or enable specific features directly
SELFHOSTED_ENABLE_RISKGAME=1
```
