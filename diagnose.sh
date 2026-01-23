#!/bin/bash

echo "=========================================="
echo "  MAKEJA HOMES - COMPREHENSIVE DIAGNOSIS"
echo "=========================================="
echo ""

echo "1. CHECKING .ENV FILE"
echo "===================="
echo "Checking if .env exists..."
if [ -f .env ]; then
    echo "✓ .env file exists"
    echo ""
    echo "NEXTAUTH_SECRET:"
    grep "NEXTAUTH_SECRET" .env || echo "❌ NEXTAUTH_SECRET NOT FOUND!"
    echo ""
    echo "PAYSTACK keys:"
    grep "PAYSTACK" .env || echo "❌ No PAYSTACK keys found!"
else
    echo "❌ .env file does NOT exist!"
fi

echo ""
echo "2. CHECKING PAYSTACK LIBRARY"
echo "============================"
if [ -f lib/paystack.ts ]; then
    echo "✓ lib/paystack.ts exists"
    head -20 lib/paystack.ts
else
    echo "❌ lib/paystack.ts does NOT exist!"
fi

echo ""
echo "3. CHECKING API ROUTES"
echo "====================="
echo "Banks API:"
if [ -f app/api/admin/paystack/banks/route.ts ]; then
    echo "✓ Banks API exists"
else
    echo "❌ Banks API does NOT exist!"
fi

echo ""
echo "Properties [id] API:"
if [ -f app/api/admin/properties/[id]/route.ts ]; then
    echo "✓ Properties [id] API exists"
    echo "First 30 lines:"
    head -30 app/api/admin/properties/[id]/route.ts
else
    echo "❌ Properties [id] API does NOT exist!"
fi

echo ""
echo "4. CHECKING NODE MODULES"
echo "======================="
echo "jose package:"
npm list jose 2>/dev/null || echo "❌ jose not installed"

echo ""
echo "5. CHECKING PROCESS ENV"
echo "======================"
node -e "console.log('NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET)" 2>/dev/null || echo "Cannot check - Node.js issue"

echo ""
echo "6. CHECKING GIT STATUS"
echo "====================="
git status --short 2>/dev/null || echo "Not a git repo or git not available"

echo ""
echo "=========================================="
echo "  DIAGNOSIS COMPLETE"
echo "=========================================="
