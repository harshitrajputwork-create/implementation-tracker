'use client'

import { useState } from 'react'
import { Users, Settings as SettingsIcon } from 'lucide-react'
import TeamClient from '../team/TeamClient'
import ConfigEditor, { type TemplateStep } from '../config/ConfigEditor'
import ConfigOptionsEditor from '../config/ConfigOptionsEditor'
import type { Profile, Invitation, ConfigOption } from '@/lib/types'

type Tab = 'team' | 'config'

interface Props {
  initialTab: Tab
  members: Profile[]
  invitations: Invitation[]
  currentUserId: string | null
  steps: TemplateStep[]
  configOptions: ConfigOption[]
  optionsMigrationMissing: boolean
  stepsMigrationMissing: boolean
}

export default function SettingsView({
  initialTab, members, invitations, currentUserId, steps, configOptions, optionsMigrationMissing, stepsMigrationMissing,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div>
      <div className="flex gap-1 mb-8 border-b border-gray-200">
        <button
          onClick={() => setTab('team')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'team' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Team
        </button>
        <button
          onClick={() => setTab('config')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <SettingsIcon className="w-3.5 h-3.5" /> Configuration
        </button>
      </div>

      {tab === 'team' ? (
        <TeamClient members={members} invitations={invitations} currentUserId={currentUserId} />
      ) : (
        <div>
          <div className="mb-10">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-900">Dropdown Options</h2>
              <p className="text-sm text-gray-500 mt-1">
                Values available in the Sales SPOC, Country, KAM, and Modules selectors when creating or editing a client.
              </p>
            </div>
            {optionsMigrationMissing && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <strong>Migration not run yet.</strong> Run <code className="font-mono bg-amber-100 px-1 rounded">005_client_metadata.sql</code> in Supabase SQL Editor to enable editing.
              </div>
            )}
            <ConfigOptionsEditor initialOptions={configOptions} />
          </div>

          <hr className="border-gray-200 mb-10" />

          <div>
            <div className="mb-5">
              <h2 className="text-base font-semibold text-gray-900">Default 30-Day Plan Template</h2>
              <p className="text-sm text-gray-500 mt-1">
                These steps are copied to every new client when they are created. Editing here does not
                affect existing clients — only new ones created after you save.
              </p>
            </div>
            {stepsMigrationMissing && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <strong>Migration not run yet.</strong> Run <code className="font-mono bg-amber-100 px-1 rounded">004_step_templates.sql</code> in Supabase SQL Editor to enable editing. Showing read-only defaults for now.
              </div>
            )}
            <ConfigEditor initialSteps={steps} />
          </div>
        </div>
      )}
    </div>
  )
}
