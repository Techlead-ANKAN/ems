import { supabase } from './supabaseClient'

// TASK STATUS VALUES
// - 'todo'
// - 'in_progress'
// - 'done'

export async function getTasksForManager() {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, status, due_date, employee_email, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getTasksForEmployee(email) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, status, due_date, employee_email, created_at')
    .eq('employee_email', email)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createTask(task) {
  const { error } = await supabase.from('tasks').insert([
    {
      title: task.title,
      description: task.description,
      status: task.status,
      due_date: task.due_date || null,
      employee_email: task.employee_email,
    },
  ])

  if (error) throw error
}

export async function updateTask(task) {
  const { error } = await supabase
    .from('tasks')
    .update({
      title: task.title,
      description: task.description,
      status: task.status,
      due_date: task.due_date || null,
      employee_email: task.employee_email,
    })
    .eq('id', task.id)

  if (error) throw error
}

export async function updateTaskStatus(id, status) {
  const fields = { status }

  if (status === 'done') {
    fields.completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('tasks')
    .update(fields)
    .eq('id', id)

  if (error) throw error
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}
