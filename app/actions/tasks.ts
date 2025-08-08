'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTaskSchema, updateTaskSchema } from '@/validators/task'

export async function createTask(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const input = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    status: formData.get('status') as string,
    priority: formData.get('priority') as string,
    due_date: formData.get('due_date') as string,
  }

  try {
    const validated = createTaskSchema.parse(input)
    
    const { error } = await supabase
      .from('tasks')
      .insert({
        ...validated,
        user_id: user.id,
      })

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to create task' }
  }
}

export async function updateTask(taskId: string, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const input = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    status: formData.get('status') as string,
    priority: formData.get('priority') as string,
    due_date: formData.get('due_date') as string,
  }

  try {
    const validated = updateTaskSchema.parse(input)
    
    const { error } = await supabase
      .from('tasks')
      .update(validated)
      .eq('id', taskId)
      .eq('user_id', user.id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to update task' }
  }
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}