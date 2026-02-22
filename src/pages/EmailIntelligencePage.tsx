// EmailIntelligencePage.tsx - Wrapper that provides workspaceId from auth context
import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'
import { useTaskContext } from '@/contexts/TaskContext'
import EmailIntelligence from './EmailIntelligence'

export default function EmailIntelligencePage() {
    const { user } = useAuth()
    const { workspaces } = useTaskContext()

    // Use the first available workspace, or fall back to empty string
    // In a multi-workspace setup, you could add a workspace selector here
    const workspaceId = workspaces?.[0]?.id || ''

    if (!workspaceId) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400">
                <p>No workspace found. Please create or join a workspace first.</p>
            </div>
        )
    }

    return (
        <Layout>
            <EmailIntelligence workspaceId={workspaceId} />
        </Layout>
    )
}
