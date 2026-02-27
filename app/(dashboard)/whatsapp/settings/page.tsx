'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageTemplate } from '@/types'
import { Settings, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function WhatsAppSettingsPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [instanceId, setInstanceId] = useState('')
  const [token, setToken] = useState('')
  const [reEngagementDays, setReEngagementDays] = useState(2)
  const [saving, setSaving] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ name: '', category: 'custom', content: '' })
  const [addingTemplate, setAddingTemplate] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetch('/api/whatsapp/templates')
      .then((r) => r.json())
      .then(setTemplates)
  }, [])

  async function saveSettings() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ultramsg_instance_id: instanceId,
          ultramsg_token: token,
          default_re_engagement_days: reEngagementDays,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function addTemplate() {
    if (!newTemplate.name || !newTemplate.content) return
    setAddingTemplate(true)
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      })
      const t = await res.json()
      setTemplates((prev) => [t, ...prev])
      setNewTemplate({ name: '', category: 'custom', content: '' })
      setDialogOpen(false)
      toast.success('Template created')
    } catch {
      toast.error('Failed to create template')
    } finally {
      setAddingTemplate(false)
    }
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/whatsapp/templates/${id}`, { method: 'DELETE' })
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    toast.success('Template deleted')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Settings</h1>
          <p className="text-sm text-muted-foreground">Configure UltraMSG and re-engagement rules</p>
        </div>
      </div>

      {/* UltraMSG config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">UltraMSG Configuration</CardTitle>
          <CardDescription>
            Get your Instance ID and Token from the{' '}
            <a href="https://app.ultramsg.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              UltraMSG dashboard
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Instance ID</Label>
            <Input
              placeholder="instance12345"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Token</Label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Webhook URL (set this in UltraMSG dashboard)</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.netlify.app'}/api/webhooks/ultramsg`}
                className="font-mono text-xs bg-muted"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/ultramsg`)
                  toast.success('Copied!')
                }}
              >
                Copy
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Default re-engagement interval (days)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={reEngagementDays}
              onChange={(e) => setReEngagementDays(Number(e.target.value))}
              className="w-24"
            />
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save settings
          </Button>
        </CardContent>
      </Card>

      {/* Message templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Message Templates</CardTitle>
              <CardDescription>
                Use {'{{name}}'} for the contact name in your templates
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New message template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template name</Label>
                    <Input
                      placeholder="e.g. Welcome message"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newTemplate.category} onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="followup">Follow-up</SelectItem>
                        <SelectItem value="reengagement">Re-engagement</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Message content</Label>
                    <Textarea
                      placeholder="Hi {{name}}, thanks for your interest..."
                      className="min-h-[120px]"
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    />
                  </div>
                  <Button className="w-full" onClick={addTemplate} disabled={addingTemplate}>
                    {addingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No templates yet. Add your first message template.</p>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="flex gap-3 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{t.name}</p>
                      <Badge variant="outline" className="text-xs capitalize">{t.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteTemplate(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta Ads config hint */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meta Lead Ads Webhook</CardTitle>
          <CardDescription>
            Set this URL as the webhook in your Meta App Dashboard (Webhooks → leadgen subscription)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.netlify.app'}/api/webhooks/meta-leads`}
              className="font-mono text-xs bg-muted"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/meta-leads`)
                toast.success('Copied!')
              }}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Set <code className="bg-muted px-1 rounded">META_VERIFY_TOKEN</code> in your environment variables and use the same value as the verify token in Meta.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
