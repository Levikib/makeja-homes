import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import { getSuperAdminSession } from '@/lib/super-admin-auth'
import {
  getAllSuperAdmins,
  createSuperAdmin,
  setInviteToken,
  updateSuperAdmin,
  type SuperAdminRole,
} from '@/lib/super-admin-db'

export const dynamic = 'force-dynamic'

function mailer() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS },
  })
}

/**
 * GET /api/super-admin/team
 * Returns all super-admin users. OWNER only.
 */
export async function GET(req: NextRequest) {
  const session = await getSuperAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.saRole !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await getAllSuperAdmins()
  return NextResponse.json({ users })
}

/**
 * POST /api/super-admin/team
 * Invite a new super-admin user. OWNER only.
 * Body: { email, firstName, lastName, role: 'OWNER' | 'VIEWER' }
 */
export async function POST(req: NextRequest) {
  const session = await getSuperAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.saRole !== 'OWNER') return NextResponse.json({ error: 'Forbidden — only owners can invite team members' }, { status: 403 })

  try {
    const { email, firstName, lastName, role } = await req.json()

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
    }
    if (!['OWNER', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: 'Role must be OWNER or VIEWER' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    // Temp hashed password — user must set their own via invite link
    const tempHash = await bcrypt.hash(crypto.randomUUID(), 10)

    await createSuperAdmin({
      id,
      email: email.toLowerCase().trim(),
      password: tempHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role as SuperAdminRole,
      mustSetPassword: true,
    })

    // Generate invite token — 48h expiry
    const rawToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
    await setInviteToken(id, rawToken, expiresAt)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://makejahomes.co.ke'
    const inviteLink = `${appUrl}/super-admin/accept-invite?token=${rawToken}`

    // Send invite email
    try {
      await mailer().sendMail({
        from: `"Makeja Homes" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `You've been invited to manage Makeja Homes`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff;">
<div style="max-width:520px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;background:linear-gradient(135deg,#7c3aed,#4338ca);border-radius:14px;margin-bottom:12px;">
      <span style="font-size:24px;">🛡️</span>
    </div>
    <h1 style="margin:0;font-size:24px;font-weight:700;background:linear-gradient(to right,#a78bfa,#67e8f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Makeja Homes</h1>
    <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">Platform Administration</p>
  </div>
  <div style="background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;">
    <h2 style="color:#f9fafb;font-size:20px;font-weight:600;margin:0 0 8px;">You've been invited!</h2>
    <p style="color:#9ca3af;margin:0 0 20px;line-height:1.6;">
      <strong style="color:#e5e7eb;">${session.firstName} ${session.lastName}</strong> has invited you to join the Makeja Homes platform as a <strong style="color:#a78bfa;">${role === 'OWNER' ? 'Full Admin (Owner)' : 'Viewer'}</strong>.
    </p>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px;">
      ${role === 'OWNER'
        ? 'You will have full access to manage clients, subscriptions, and team members.'
        : 'You will have read-only access to view clients and platform metrics.'}
    </p>
    <a href="${inviteLink}" style="display:block;text-align:center;background:linear-gradient(to right,#7c3aed,#4338ca);color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;">Accept Invitation & Set Password</a>
    <p style="color:#6b7280;font-size:12px;text-align:center;margin:16px 0 0;">This link expires in 48 hours.</p>
  </div>
  <p style="color:#374151;font-size:12px;text-align:center;margin-top:24px;">Makeja Homes Platform · support@makejahomes.co.ke</p>
</div></body></html>`,
      })
    } catch (emailErr: any) {
      console.error('[team invite] Email failed:', emailErr?.message)
      // Don't fail the request — user was created, just email didn't send
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      inviteLink, // Return link in case email fails — owner can share manually
    }, { status: 201 })
  } catch (err: any) {
    console.error('[team invite] Error:', err?.message)
    if (err?.message?.includes('unique') || err?.message?.includes('duplicate')) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }
}

/**
 * PATCH /api/super-admin/team
 * Update a team member (role or active status). OWNER only.
 * Body: { id, role?, isActive? }
 */
export async function PATCH(req: NextRequest) {
  const session = await getSuperAdminSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.saRole !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { id, role, isActive } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    // Prevent owner from deactivating themselves
    if (id === session.id && isActive === false) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 })
    }

    await updateSuperAdmin(id, {
      ...(role !== undefined ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 })
  }
}
