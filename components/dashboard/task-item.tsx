'use client'

import { useState } from 'react'
import { Task } from '@/types/task'
import { deleteTask, updateTask } from '@/app/actions/tasks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Edit, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskItemProps {
  task: Task
}

export function TaskItem({ task }: TaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const statusIcon = {
    pending: <Clock className="w-4 h-4" />,
    in_progress: <AlertCircle className="w-4 h-4" />,
    completed: <CheckCircle className="w-4 h-4" />,
  }[task.status]

  const priorityColor = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  }[task.priority]

  async function handleDelete() {
    setIsDeleting(true)
    await deleteTask(task.id)
    setIsDeleting(false)
  }

  async function handleStatusToggle() {
    setIsUpdating(true)
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    const formData = new FormData()
    formData.set('status', newStatus)
    await updateTask(task.id, formData)
    setIsUpdating(false)
  }

  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-lg border bg-white dark:bg-gray-800",
      task.status === 'completed' && "opacity-60"
    )}>
      <div className="flex items-center gap-3">
        <button
          onClick={handleStatusToggle}
          disabled={isUpdating}
          className="text-gray-500 hover:text-primary transition-colors"
        >
          {statusIcon}
        </button>
        <div>
          <h4 className={cn(
            "font-medium",
            task.status === 'completed' && "line-through"
          )}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className={priorityColor}>
              {task.priority}
            </Badge>
            {task.due_date && (
              <span className="text-xs text-gray-500">
                Due: {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}