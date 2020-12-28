const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex');

// const db = knex({
//     client:'pg',
//     connection:{
//         host:'postgresql-cubic-50319',
//         user:'nicu',
//         password:'231990',
//         database:'rassign'
//     }
// });

const db = knex({
    client:'pg',
    connection:{
        connectionString:process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    }
});

const app =  express();
app.use(cors());
app.use(bodyParser.json());


// app.get('/', (req, res)=>{
//     db('opportunity').where('status', 'Exp').then(data=>{
//         res.json(data);
//     })
// })

app.get('/', (req, res)=>{
    res.send('It is working');
})

app.post('/byTm', (req, res)=>{
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    if(startDate === 'Invalid date' || endDate === 'Invalid date'){
        db
            .select('tendermanager' ,db.raw('COUNT(*)'))
            .from('opportunity')
            .where({status:'Exp'})
            .whereNotNull('tendermanager')
            .groupByRaw('tendermanager')
            .orderBy('count','desc')
            .then(data=>{
                res.json(data);
            })
            .catch(err=>res.status(400).json('cant fetch by TM'))
    }else{
        db
            .select('tendermanager' ,db.raw('COUNT(*)'))
            .from('opportunity')
            .where({status:'Exp'})
            .whereNotNull('tendermanager')
            .whereBetween('launchdate', [startDate, endDate])
            .groupByRaw('tendermanager')
            .orderBy('count','desc')
            .then(data=>{
                res.json(data);
            })
            .catch(err=>res.status(400).json('cant fetch by TM'))
    }

})

app.post('/opptDetails', (req, res)=>{
    const tm = req.body.tmName;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;

    if(startDate === 'Invalid date' || endDate === 'Invalid date'){
        db('opportunity')
            .where({
                tendermanager:tm,
                status:'Exp'
            })
            .orderBy('launchdate', 'asc')
            .then(data=>{
                res.json(data)
            })
            .catch(err=>res.status(400).json('cant get oppt details'))
    }else{
        db('opportunity')
            .where({
                tendermanager:tm,
                status:'Exp'
            })
            .whereBetween('launchdate', [startDate, endDate])
            .orderBy('launchdate', 'asc')
            .then(data=>{
                res.json(data)
            })
            .catch(err=>res.status(400).json('cant get oppt details'))
    }


})

app.put('/assigntm', (req, res)=>{
    const {tmName, opptId} = req.body;
    db('opportunity')
        .where('opportunityid', '=',opptId)
        .update({
            tendermanager:tmName
        })
        .then(data=>res.json(data))
        .catch(err=>res.status(400).json('cant assign tm'))
})

app.get('/tmList', (req, res)=>{
    db
        .select('tendermanager')
        .distinct('tendermanager')
        .from('opportunity')
        .where({status:'Exp'})
        .whereNotNull('tendermanager')
        .then(data=>{
            res.json(data);
        })
        .catch(err=>res.status(400).json('cant get tm list'))
})

app.listen(process.env.PORT || 3005, ()=>{
    console.log(`I am listening on port ${process.env.PORT}`)
})