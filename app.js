const {format, compareAsc} = require('date-fns')
var isValid = require('date-fns/isValid')
const express = require('express')

const date = require('date-fns')
const {open} = require('sqlite')
const app = express()
const sqlite3 = require('sqlite3')
app.use(express.json())
const path = require('path')
let db = null

const dbpath = path.join(__dirname, 'todoApplication.db')

const initializeTheServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server is running')
    })
  } catch (err) {
    console.log(`DB error: ${err.message}`)
    process.exit(-1)
  }
}
initializeTheServer()

const convertToCamelCase = dbObject => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    category: dbObject.category,
    priority: dbObject.priority,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  }
}
const verifyDataQuery = async (request, response, next) => {
  const {status, priority, category} = request.query
  if (
    status !== undefined &&
    !['TO DO', 'IN PROGRESS', 'DONE'].includes(status)
  ) {
    response.status(400)
    response.send('Invalid Todo Status')
  } else if (
    priority !== undefined &&
    !['HIGH', 'MEDIUM', 'LOW'].includes(priority)
  ) {
    response.status(400)
    response.send('Invalid Todo Priority')
  } else if (
    category !== undefined &&
    !['WORK', 'HOME', 'LEARNING'].includes(category)
  ) {
    response.status(400)
    response.send('Invalid Todo Category')
  } else {
    next()
  }
}

app.get('/todos/', verifyDataQuery, async (request, response) => {
  let data = null
  let getTodosQuery = ''
  const {status, priority, category, search_q = ''} = request.query

  const hasStatus = queryParams => {
    return queryParams.status !== undefined
  }
  const hasPriority = queryParams => {
    return queryParams.priority !== undefined
  }
  const hasStatusAndPriority = queryParams => {
    return (
      queryParams.status !== undefined && queryParams.priority !== undefined
    )
  }
  const hasCategory = queryParams => {
    return queryParams.category !== undefined
  }
  const hasStatusAndCategory = queryParams => {
    return (
      queryParams.status !== undefined && queryParams.category !== undefined
    )
  }
  const hasPriorityAndCategory = queryParams => {
    return (
      queryParams.priority !== undefined && queryParams.category !== undefined
    )
  }

  switch (true) {
    case hasStatus(request.query):
      if (status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE') {
        getTodosQuery = `SELECT * FROM todo WHERE status = '${status}';`
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
      }

      break
    case hasPriority(request.query):
      if (priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') {
        getTodosQuery = `SELECT * FROM todo WHERE priority = '${priority}';`
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break
    case hasCategory(request.query):
      if (
        category === 'WORK' ||
        category === 'HOME' ||
        category === 'LEARNING'
      ) {
        getTodosQuery = `SELECT * FROM todo WHERE category = '${category}';`
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }

      break
    case hasStatusAndPriority(request.query):
      getTodosQuery = `SELECT * FROM todo WHERE (priority = '${priority}') AND (status = '${status}');`
      break
    case hasStatusAndCategory(request.query):
      getTodosQuery = `SELECT * FROM todo WHERE (category = '${category}') AND (status = '${status}');`
      break
    case hasPriorityAndCategory(request.query):
      getTodosQuery = `SELECT * FROM todo WHERE (category = '${category}') AND (priority = '${priority}');`
      break
    default:
      getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%';`
      break
  }

  const dbResponse = await db.all(getTodosQuery)
  response.send(dbResponse.map(eachObject => convertToCamelCase(eachObject)))
})

// get todo by id

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getQuery = `SELECT * FROM todo WHERE id = ${todoId};`
  const dbResponse = await db.get(getQuery)
  response.send(convertToCamelCase(dbResponse))
})

// get todo with specific due date

app.get('/agenda/', verifyDataQuery, async (request, response) => {
  try {
    const {date} = request.query
    let dateObj = new Date(date)

    const isDateValid = isValid(dateObj)
    const formattedDate = format(dateObj, 'yyyy-MM-dd')
    if (!isDateValid) {
      response.status(400)
      response.send('Invalid Due Date')
    } else {
      const getQuery = `SELECT * FROM todo WHERE due_date = '${formattedDate}';`

      const dbResponse = await db.all(getQuery)
      response.send(
        dbResponse.map(eachObject => convertToCamelCase(eachObject)),
      )
    }
  } catch (err) {
    console.log(`error message: ${err.message}`)
    response.status(400)
    response.send('Invalid Due Date')
  }
})

const verifyDataBody = async (request, response, next) => {
  const {id, todo, category, priority, status, dueDate} = request.body

  if (dueDate !== undefined) {
    let dateObj = new Date(dueDate)
    if (!isValid(dateObj)) {
      response.status(400)
      response.send('Invalid Due Date')
    }
  }

  if (
    status !== undefined &&
    !['TO DO', 'IN PROGRESS', 'DONE'].includes(status)
  ) {
    response.status(400)
    response.send('Invalid Todo Status')
  } else if (
    priority !== undefined &&
    !['HIGH', 'MEDIUM', 'LOW'].includes(priority)
  ) {
    response.status(400)
    response.send('Invalid Todo Priority')
  } else if (
    category !== undefined &&
    !['WORK', 'HOME', 'LEARNING'].includes(category)
  ) {
    response.status(400)
    response.send('Invalid Todo Category')
  } else {
    next()
  }
}

app.post('/todos/', verifyDataBody, async (request, response) => {
  const {id, todo, category, priority, status, dueDate} = request.body
  let formattedDate
  if (dueDate !== undefined) {
    let dateObj = new Date(dueDate)
    const isDateValid = isValid(dateObj)
    if (isDateValid) {
      formattedDate = format(dateObj, 'yyyy-MM-dd')
    }
  }
  const createTodoQuery = `INSERT INTO todo (id, todo, category, priority, status, due_date)
    VALUES (
      ${id},
      '${todo}',
      '${category}',
      '${priority}',
      '${status}',
      '${formattedDate}'
    );`
  // const getQuer = `SELECT * FROM todo;`
  await db.run(createTodoQuery)
  response.send('Todo Successfully Added')
})

//update details

app.put('/todos/:todoId/', verifyDataBody, async (request, response) => {
  const {todoId} = request.params

  const prevTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`
  const prevTodo = await db.get(prevTodoQuery)

  const {
    todo = prevTodo.todo,
    category = prevTodo.category,
    priority = prevTodo.priority,
    status = prevTodo.status,
    dueDate = prevTodo.dueDate,
  } = request.body
  let todoDetails = request.body

  let formattedDate

  if (dueDate !== undefined) {
    let dateObj = new Date(dueDate)
    const isDateValid = isValid(dateObj)
    if (isDateValid) {
      formattedDate = format(dateObj, 'yyyy-MM-dd')
    }
  }

  const hasStatus = queryParams => {
    return queryParams.status !== undefined
  }
  const hasPriority = queryParams => {
    return queryParams.priority !== undefined
  }
  const hasCategory = queryParams => {
    return queryParams.category !== undefined
  }
  const hasTodo = queryParams => {
    return queryParams.todo !== undefined
  }

  let getTodosQuery = ''
  let result = ''

  switch (true) {
    case hasStatus(todoDetails):
      getTodosQuery = `UPDATE todo
          SET status = '${status}'
        WHERE id = ${todoId};`
      result = 'Status Updated'

      break
    case hasPriority(todoDetails):
      getTodosQuery = `UPDATE todo
           SET
            priority = '${priority}' 
          WHERE id = ${todoId};`
      result = 'Priority Updated'
      break
    case hasCategory(todoDetails):
      getTodosQuery = `UPDATE todo SET category = '${category}' WHERE id = ${todoId};`
      result = 'Category Updated'
      break
    case hasTodo(todoDetails):
      getTodosQuery = `UPDATE todo SET todo = '${todo}' WHERE id = ${todoId};`
      result = 'Todo Updated'
      break

    default:
      getTodosQuery = `UPDATE todo SET due_date = '${formattedDate}' WHERE id = ${todoId};`
      result = 'Due Date Updated'
      break
  }
  await db.run(getTodosQuery)
  response.send(result)
})
//delete todo
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getQuery = `DELETE FROM todo WHERE id = ${todoId};`
  const dbResponse = await db.run(getQuery)
  response.send('Todo Deleted')
})

module.exports = app
