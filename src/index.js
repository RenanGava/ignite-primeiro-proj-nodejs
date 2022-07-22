const express = require('express');
const { v4: uuidv4 } = require('uuid')

const app = express()

app.use(express.json())

var customers = []

//Middleware

function verifyExistAccountCPF(request, response, next) {
    const { cpf } = request.headers;

    const customer = customers.find(customer => customer.cpf === cpf);

    if (!customer) {
        return response.status(400).json({ error: "Customer not Found" })
    }

    // nomeamos um atributo na requisição para recebermos ele dentro das rotas
    // pelo request serve para qualquer parametro
    request.customer = customer

    return next()
}

function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if( operation.type === 'credit') {
            return acc + operation.amount
        }else{
            return acc - operation.amount
        }
    }, 0)

    return balance
}

app.post("/account", (request, response) => {
    const { cpf, name } = request.body;

    const customerAlreadyExists = customers.some((customer) => {
        return customer.cpf === cpf
    })

    if (customerAlreadyExists) {
        return response.status(400).json({ error: "Customer Already exists !!" })
    }

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    })

    return response.status(201).send()

});

// utilizar o middleware dessa forma somente se todas as rotas
// forem utilizar esse middleware
// app.use(verifyExistAccountCPF)

// dessa forma somente está rota pode usar este middleware
app.get("/statement", verifyExistAccountCPF, (request, response) => {

    const { customer } = request
    return response.json(customer)
})

app.post("/deposit", verifyExistAccountCPF, (request, response) => {
    const { description, amount } = request.body;

    const { customer } = request

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation)

    return response.status(201).send()
})

app.post("/withdraw", verifyExistAccountCPF, (request, response) => {
    const { amount } = request.body
    const { customer } = request

    const balance = getBalance(customer.statement)

    if(balance < amount){
        return response.status(400).json({error: "Insufficient funds!"})
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }

    customer.statement.push(statementOperation)

    return response.status(201).send()
})

app.get("/statement/date", verifyExistAccountCPF, (request, response) => {

    const { customer } = request
    const { date } = request.query

    const dateFormat = new Date( date + " 00:00");

    const statement = customer.statement.filter((statement) => {
        return statement.created_at.toDateString() === new Date(dateFormat).toDateString()
    })

    return response.json(statement)
})

app.put("/account", verifyExistAccountCPF, (request, response) => {
    const { name } = request.body;
    const { customer } = request; //vem do verifyExistAccountCPF

    customer.name = name

    return response.status(201).send()
})

app.get("/account",verifyExistAccountCPF ,(request, response) => {
    const { customer } = request;

    return response.status(200).json(customer)
})

app.delete("/account", verifyExistAccountCPF, (request, response) => {
    const { customer } = request;

    const customerRemoved = customers.filter( account => {
        return account.cpf !== customer.cpf
    })

    customers = customerRemoved

    return response.status(200).send(customers)
})

app.get("/balance", verifyExistAccountCPF, (request, response) => {
    const { customer } = request

    const balance = getBalance(customer.statement)

    return response.json(balance)
})

app.listen(3333, () => {
    console.log("Servidor Rodando!!!");
})