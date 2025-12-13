#!/bin/bash
# Find and replace "Mizpha Rentals" with "Makeja Homes" in layout files
find app -name "layout.tsx" -type f -exec sed -i 's/Mizpha Rentals/Makeja Homes/g' {} +
find app -name "page.tsx" -type f -exec sed -i 's/Mizpha Rentals/Makeja Homes/g' {} +
echo "✅ Layout files updated with Makeja Homes branding"
