'use client'

import { useState, useTransition } from 'react'
import type { Profile, Invitation, Role } from '@/lib/types'
import { cn, getInitials } from '@/lib/utils'
import { inviteUserAction, updateUserRoleAction, revokeInvitationAction, removeMemberAction } from './actions'
import { Mail, Shield, Plus, X, Check, Trash2 } from 'lucide-react'

const ROLES: Role[] = ['admin', 'member', 'visitor']

const ROLE_COLORS: Record<Role, string> = {
  admin:   'bg-purple-100 text-purple-700',
  member:  'bg-blue-100 text-blue-700',
  visitor: 'bg-gray-100 text-gray-600',
}

function RoleSelect({
  profileId,
  currentRole,
}: {
  profileId: string
  currentRole: Role
}) {
  const [role, setRole] = useState<Role>(currentRole)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function change(newRole: Role) {
    setRole(newRole)
    setSaved(false)
    startTransition(async () => {
      await updateUserRoleAction(profileId, newRole)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={(e) => change(e.target.value as Role)}
        disabled={isPending}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r} value={r} className="capitalize">{r}</option>
        ))}
      </select>
      {saved && <Check className="w-3.5 h-3.5 text-green-500" />}
    </div>
  )
}

export default function TeamClient({
  members,
  invitations,
  currentUserId,
}: {
  members: Profile[]
  invitations: Invitation[]
  currentUserId: string | null
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState('')

  const [email, setEmail]       = useState('')
  const [role, setRole]         = useState<Role>('member')
  const [isPending, startTransition] = useTransition()
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  function sendInvite() {
    if (!email.trim()) return
    setInviteError('')
    setInviteSuccess('')
    startTransition(async () => {
      const res = await inviteUserAction(email, role)
      if (res.error) {
        setInviteError(res.error)
      } else {
        setInviteSuccess(`Invite sent to ${email.trim()}`)
        setEmail('')
      }
    })
  }

  function removeMember(id: string) {
    if (confirmId !== id) { setConfirmId(id); setRemoveError(''); return }
    startTransition(async () => {
      const res = await removeMemberAction(id)
      if (res.error) setRemoveError(res.error)
      setConfirmId(null)
    })
  }

  function revoke(id: string) {
    startTransition(async () => {
      await revokeInvitationAction(id)
    })
  }

  return (
    <div className="space-y-8">
      {/* Invite form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-blue-500" />
          Invite someone
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Enter their Google email. When they sign in for the first time they&apos;ll automatically get the role you assign.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r} className="capitalize">{r}</option>
            ))}
          </select>
          <button
            onClick={sendInvite}
            disabled={isPending || !email.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {isPending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
        {inviteError  && <p className="text-sm text-red-600 mt-2">{inviteError}</p>}
        {inviteSuccess && <p className="text-sm text-green-600 mt-2">✓ {inviteSuccess}</p>}
      </div>

      {/* Pending invites */}
      {invitations.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Pending invitations</h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-400">Invited · not yet signed in</p>
                </div>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', ROLE_COLORS[inv.role])}>
                  {inv.role}
                </span>
                <button
                  onClick={() => revoke(inv.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Revoke invite"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members list */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">
          Members <span className="text-gray-400 font-normal text-sm">({members.length})</span>
        </h2>
        {removeError && <p className="text-sm text-red-600 mb-2">{removeError}</p>}
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                {getInitials(m.full_name ?? m.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{m.full_name ?? '—'}</p>
                <p className="text-xs text-gray-400">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-3.5 h-3.5 text-gray-300" />
                <RoleSelect profileId={m.id} currentRole={m.role} />
                {m.id !== currentUserId && (
                  <button
                    onClick={() => removeMember(m.id)}
                    disabled={isPending}
                    title={confirmId === m.id ? 'Click again to confirm removal' : 'Remove member'}
                    className={cn(
                      'flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 transition-colors',
                      confirmId === m.id
                        ? 'bg-red-600 text-white'
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50',
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {confirmId === m.id && 'Confirm'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role legend */}
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1.5">
        <p className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-2">Role permissions</p>
        <p><span className={cn('inline font-medium text-xs px-1.5 py-0.5 rounded-full mr-2', ROLE_COLORS.admin)}>Admin</span>Full access · manage team, use case library, all clients</p>
        <p><span className={cn('inline font-medium text-xs px-1.5 py-0.5 rounded-full mr-2', ROLE_COLORS.member)}>Member</span>Create & edit their own clients · view all clients</p>
        <p><span className={cn('inline font-medium text-xs px-1.5 py-0.5 rounded-full mr-2', ROLE_COLORS.visitor)}>Visitor</span>Read-only access to all clients · no editing</p>
        <p className="text-xs text-gray-400 pt-1">Removing a member revokes their access and deletes their personal notes, planner tasks and notifications. Clients they owned stay, unassigned.</p>
      </div>
    </div>
  )
}
