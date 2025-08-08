'use client'

import { useState } from 'react'
import { Task } from '@/types/task'
import { TaskItem } from './task-item'
import { CreateTaskDialog } from './create-task-dialog'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'

interface TaskListProps {
  initialTasks: Task[]
}

export function TaskList({ initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">All Tasks</h3>
        <Button onClick={() => setIsCreateOpen(true)} size="sm">
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No tasks yet. Create your first task to get started!
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}

      <CreateTaskDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}