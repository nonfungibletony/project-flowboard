import type { Activity } from '@group/shared'

const ACTION_LABELS: Record<string, string> = {
  created_column: 'created column',
  updated_column: 'renamed column',
  created_card: 'created card',
  updated_card: 'updated card',
  moved_card: 'moved card',
  added_comment: 'commented on card',
  deleted_card: 'deleted card',
}

export function formatActivity(a: Activity): string {
  const action = ACTION_LABELS[a.actionType] || a.actionType
  const entityName =
    a.metadata?.cardTitle ||
    a.metadata?.columnName ||
    a.metadata?.boardName ||
    a.entityType

  let detail = ''
  if (a.actionType === 'moved_card' && a.metadata?.sourceColumnName && a.metadata?.targetColumnName) {
    detail = ` from "${a.metadata.sourceColumnName}" to "${a.metadata.targetColumnName}"`
  }

  return `${a.userName || 'Someone'} ${action} "${entityName}"${detail}`
}
