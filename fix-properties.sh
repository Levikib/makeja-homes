#!/bin/bash

echo "Fixing Properties API routes..."

# Fix main route
sed -i 's/manager: false,/\/\/ manager field removed/g' app/api/properties/route.ts

# Fix individual property route
sed -i 's/manager: false,/\/\/ manager field removed/g' app/api/properties/[id]/route.ts

echo "✅ Fixed! Now restart your dev server."
