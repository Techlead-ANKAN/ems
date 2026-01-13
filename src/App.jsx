import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import {
  getTasksForManager,
  getTasksForEmployee,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from './tasksService'

// Very simple roles:
// - "manager": can create and update employees
// - "employee": can only view the list

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadInitialSession() {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error(sessionError)
      }
      const currentSession = data?.session ?? null
      setSession(currentSession)

      if (currentSession) {
        await fetchProfile(currentSession.user.id)
      }
      setLoading(false)
    }

    loadInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        fetchProfile(newSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error(profileError)
      setProfile(null)
      return
    }

    setProfile(data)
  }

  async function handleLogin(event) {
    event.preventDefault()
    setError('')

    const formData = new FormData(event.target)
    const email = formData.get('email')
    const password = formData.get('password')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      return
    }

    setSession(data.session)
    if (data.session?.user) {
      await fetchProfile(data.session.user.id)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  if (loading) {
    return (
      <div className="app-wrapper">
        <h1>Employee Management System</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="app-wrapper">
        <h1>Employee Management System</h1>
        <LoginForm onLogin={handleLogin} error={error} />
      </div>
    )
  }

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <div>
          <h1>Employee Management System</h1>
          <p>
            Logged in as <strong>{session.user.email}</strong>
            {profile?.role && ` (${profile.role})`}
          </p>
        </div>
        <button className="btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main>
        {profile?.role === 'manager' ? (
          <ManagerDashboard />
        ) : (
          <EmployeeDashboard userEmail={session.user.email} />
        )}
      </main>
    </div>
  )
}

function LoginForm({ onLogin, error }) {
  return (
    <form className="card" onSubmit={onLogin}>
      <h2>Login</h2>
      <label className="form-field">
        <span>Email</span>
        <input name="email" type="email" required />
      </label>
      <label className="form-field">
        <span>Password</span>
        <input name="password" type="password" required />
      </label>
      {error && <p className="error-text">{error}</p>}
      <button className="btn primary" type="submit">
        Sign In
      </button>
      <p className="help-text">
        Use demo accounts you create in Supabase (for example one
        employee and one manager).
      </p>
    </form>
  )
}

function ManagerDashboard() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState('')
  const [editingTask, setEditingTask] = useState(null)

  useEffect(() => {
    loadEmployees()
    loadTasks()
  }, [])

  async function loadEmployees() {
    setLoading(true)
    setError('')

    const { data, error: employeesError } = await supabase
      .from('employees')
      .select('id, full_name, email, role, status')
      .order('full_name', { ascending: true })

    if (employeesError) {
      console.error(employeesError)
      setError('Could not load employees')
      setLoading(false)
      return
    }

    setEmployees(data || [])
    setLoading(false)
  }

  async function loadTasks() {
    setTasksLoading(true)
    setTasksError('')

    try {
      const allTasks = await getTasksForManager()
      setTasks(allTasks)
    } catch (err) {
      console.error(err)
      setTasksError('Could not load tasks')
    } finally {
      setTasksLoading(false)
    }
  }

  function startCreate() {
    setEditingEmployee({ id: null, full_name: '', email: '', role: 'employee', status: 'active' })
  }

  function startCreateTask() {
    const firstEmployeeEmail = employees[0]?.email || ''
    setEditingTask({
      id: null,
      title: '',
      description: '',
      status: 'todo',
      due_date: '',
      employee_email: firstEmployeeEmail,
    })
  }

  function startEditTask(task) {
    setEditingTask({
      ...task,
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
    })
  }

  async function saveTask(taskValues) {
    setTasksError('')

    try {
      if (taskValues.id) {
        await updateTask(taskValues)
      } else {
        await createTask(taskValues)
      }
      setEditingTask(null)
      await loadTasks()
    } catch (err) {
      console.error(err)
      setTasksError('Could not save task')
    }
  }

  async function handleDeleteTask(id) {
    const confirmDelete = window.confirm('Delete this task?')
    if (!confirmDelete) return

    try {
      await deleteTask(id)
      await loadTasks()
    } catch (err) {
      console.error(err)
      setTasksError('Could not delete task')
    }
  }

  function startEdit(employee) {
    setEditingEmployee(employee)
  }

  async function saveEmployee(formValues) {
    setError('')

    if (formValues.id) {
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          full_name: formValues.full_name,
          email: formValues.email,
          role: formValues.role,
          status: formValues.status,
        })
        .eq('id', formValues.id)

      if (updateError) {
        console.error(updateError)
        setError('Could not update employee')
        return
      }
    } else {
      const { error: insertError } = await supabase.from('employees').insert([
        {
          full_name: formValues.full_name,
          email: formValues.email,
          role: formValues.role,
          status: formValues.status,
        },
      ])

      if (insertError) {
        console.error(insertError)
        setError('Could not create employee')
        return
      }
    }

    setEditingEmployee(null)
    await loadEmployees()
  }

  return (
    <section>
      <div className="section-header">
        <h2>Manage Employees</h2>
        <button className="btn primary" onClick={startCreate}>
          Add Employee
        </button>
      </div>

      {loading && <p>Loading employees...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && employees.length === 0 && <p>No employees yet.</p>}

      {!loading && employees.length > 0 && (
        <table className="employees-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.full_name}</td>
                <td>{employee.email}</td>
                <td>{employee.role}</td>
                <td>{employee.status}</td>
                <td>
                  <button className="btn" onClick={() => startEdit(employee)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingEmployee && (
        <EmployeeForm
          key={editingEmployee.id ?? 'new'}
          employee={editingEmployee}
          onCancel={() => setEditingEmployee(null)}
          onSave={saveEmployee}
        />
      )}

      <div className="section-header tasks-header">
        <h2>Manage Tasks</h2>
        <button className="btn primary" onClick={startCreateTask}>
          Add Task
        </button>
      </div>

      {tasksLoading && <p>Loading tasks...</p>}
      {tasksError && <p className="error-text">{tasksError}</p>}
      {!tasksLoading && tasks.length === 0 && <p>No tasks yet.</p>}

      {!tasksLoading && tasks.length > 0 && (
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Employee</th>
              <th>Status</th>
              <th>Due Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{task.employee_email}</td>
                <td>{task.status}</td>
                <td>{task.due_date ? task.due_date.slice(0, 10) : '-'}</td>
                <td>
                  <button className="btn" onClick={() => startEditTask(task)}>
                    Edit
                  </button>{' '}
                  <button
                    className="btn"
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editingTask && (
        <TaskForm
          key={editingTask.id ?? 'new-task'}
          task={editingTask}
          employees={employees}
          onCancel={() => setEditingTask(null)}
          onSave={saveTask}
        />
      )}
    </section>
  )
}

function EmployeeDashboard({ userEmail }) {
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState('')

  useEffect(() => {
    async function loadEmployee() {
      setLoading(true)
      setError('')

      const { data, error: employeeError } = await supabase
        .from('employees')
        .select('id, full_name, email, role, status')
        .eq('email', userEmail)
        .single()

      if (employeeError) {
        console.error(employeeError)
        setError('Could not load your employee record')
        setLoading(false)
        return
      }

      setEmployee(data)
      setLoading(false)
    }

    async function loadEmployeeTasks() {
      setTasksLoading(true)
      setTasksError('')

      try {
        const myTasks = await getTasksForEmployee(userEmail)
        setTasks(myTasks)
      } catch (err) {
        console.error(err)
        setTasksError('Could not load your tasks')
      } finally {
        setTasksLoading(false)
      }
    }

    loadEmployee()
    loadEmployeeTasks()
  }, [userEmail])

  async function handleStatusChange(id, newStatus) {
    try {
      await updateTaskStatus(id, newStatus)
      const myTasks = await getTasksForEmployee(userEmail)
      setTasks(myTasks)
    } catch (err) {
      console.error(err)
      setTasksError('Could not update task status')
    }
  }

  return (
    <section>
      <h2>Your Employee Profile</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && employee && (
        <div className="card">
          <p>
            <strong>Name:</strong> {employee.full_name}
          </p>
          <p>
            <strong>Email:</strong> {employee.email}
          </p>
          <p>
            <strong>Role:</strong> {employee.role}
          </p>
          <p>
            <strong>Status:</strong> {employee.status}
          </p>
        </div>
      )}

      <h3>My Tasks</h3>
      {tasksLoading && <p>Loading tasks...</p>}
      {tasksError && <p className="error-text">{tasksError}</p>}
      {!tasksLoading && tasks.length === 0 && <p>No tasks assigned yet.</p>}
      {!tasksLoading && tasks.length > 0 && (
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Due Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{task.status}</td>
                <td>{task.due_date ? task.due_date.slice(0, 10) : '-'}</td>
                <td>
                  <select
                    className="task-status-select"
                    value={task.status}
                    onChange={(event) =>
                      handleStatusChange(task.id, event.target.value)
                    }
                 >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function EmployeeForm({ employee, onCancel, onSave }) {
  const [formValues, setFormValues] = useState(employee)

  function handleChange(event) {
    const { name, value } = event.target
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSave(formValues)
  }

  return (
    <form className="card employee-form" onSubmit={handleSubmit}>
      <h3>{employee.id ? 'Edit Employee' : 'Add Employee'}</h3>

      <label className="form-field">
        <span>Full Name</span>
        <input
          type="text"
          name="full_name"
          value={formValues.full_name}
          onChange={handleChange}
          required
        />
      </label>

      <label className="form-field">
        <span>Email</span>
        <input
          type="email"
          name="email"
          value={formValues.email}
          onChange={handleChange}
          required
        />
      </label>

      <label className="form-field">
        <span>Role</span>
        <select name="role" value={formValues.role} onChange={handleChange}>
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
        </select>
      </label>

      <label className="form-field">
        <span>Status</span>
        <select name="status" value={formValues.status} onChange={handleChange}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary">
          Save
        </button>
      </div>
    </form>
  )
}

function TaskForm({ task, employees, onCancel, onSave }) {
  const [formValues, setFormValues] = useState(task)

  function handleChange(event) {
    const { name, value } = event.target
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSave(formValues)
  }

  return (
    <form className="card employee-form" onSubmit={handleSubmit}>
      <h3>{task.id ? 'Edit Task' : 'Add Task'}</h3>

      <label className="form-field">
        <span>Title</span>
        <input
          type="text"
          name="title"
          value={formValues.title}
          onChange={handleChange}
          required
        />
      </label>

      <label className="form-field">
        <span>Description</span>
        <textarea
          name="description"
          value={formValues.description}
          onChange={handleChange}
          rows={3}
        />
      </label>

      <label className="form-field">
        <span>Assign To (Employee Email)</span>
        <select
          name="employee_email"
          value={formValues.employee_email}
          onChange={handleChange}
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.email}>
              {emp.full_name} ({emp.email})
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span>Status</span>
        <select name="status" value={formValues.status} onChange={handleChange}>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </label>

      <label className="form-field">
        <span>Due Date</span>
        <input
          type="date"
          name="due_date"
          value={formValues.due_date}
          onChange={handleChange}
        />
      </label>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary">
          Save Task
        </button>
      </div>
    </form>
  )
}

export default App
