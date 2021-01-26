const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex');

// const db = knex({
//     client: 'pg',
//     connection: {
//         host: '127.0.0.1',
//         user: 'nicu',
//         password: '231990',
//         database: 'rassign'
//     }
// });

teams = {
    Aer: [{name: 'Lu Sa', level: 'S'}],
    Bcr: [{name: 'Ai Pa', level: 'S'}, {name: 'Ho Ro', level: 'J'}, {name: 'Pr Bo', level: 'J'}],
    Sgpr:[{name:'De Le', level:'S'}, {name:'La Ro', level:'J'}, {name:'Ca Sh', level:'J'}, {name:'Ta To', level:'J'}],
    Amr:[{name:'La Ma', level:'S'}, {name:'Re Ro', level:'S'}, {name:'Ne An', level:'S'}, {name:'Wa Al', level:'J'}],
    Ess:[{name:'Dr Di', level:'S'}, {name:'St Ar', level:'S'}, {name:'Mo Ru', level: "J"}, {name:'Sc Ch', level: 'J'}]
}

const db = knex({
    client:'pg',
    connection:{
        connectionString:process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    }
});

const app = express();
app.use(cors());
app.use(bodyParser.json());


// app.get('/', (req, res)=>{
//     db('opportunity').where('status', 'Exp').then(data=>{
//         res.json(data);
//     })
// })

app.get('/', (req, res) => {
    res.send('It is working');
})

app.post('/byTm', (req, res) => {
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    if (startDate === 'Invalid date' || endDate === 'Invalid date') {
        db
            .select('tendermanager', db.raw('COUNT(*)'))
            .from('opportunity')
            .where({status: 'Exp'})
            .whereNotNull('tendermanager')
            .groupByRaw('tendermanager')
            .orderBy('count', 'desc')
            .then(data => {
                res.json(data);
            })
            .catch(err => res.status(400).json('cant fetch by TM'))
    } else {
        db
            .select('tendermanager', db.raw('COUNT(*)'))
            .from('opportunity')
            .where({status: 'Exp'})
            .whereNotNull('tendermanager')
            .whereBetween('launchdate', [startDate, endDate])
            .groupByRaw('tendermanager')
            .orderBy('count', 'desc')
            .then(data => {
                res.json(data);
            })
            .catch(err => res.status(400).json('cant fetch by TM'))
    }

})

app.post('/opptDetails', (req, res) => {
    const tm = req.body.tmName;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;

    if (startDate === 'Invalid date' || endDate === 'Invalid date') {
        db('opportunity')
            .where({
                // tendermanager: tm,
                status: 'Exp'
            })
            .orderBy('launchdate', 'asc')
            .then(data => {
                res.json(data)
            })
            .catch(err => res.status(400).json('cant get oppt details'))
    } else {
        db('opportunity')
            .where({
                // tendermanager: tm,
                status: 'Exp'
            })
            .whereBetween('launchdate', [startDate, endDate])
            .orderBy('launchdate', 'asc')
            .then(data => {
                res.json(data)
            })
            .catch(err => res.status(400).json('cant get oppt details'))
    }


})

app.put('/assigntm', (req, res) => {
    const {tmName, opptId} = req.body;
    db('opportunity')
        .where('opportunityid', '=', opptId)
        .update({
            tendermanager: tmName
        })
        .then(data => res.json(data))
        .catch(err => res.status(400).json('cant assign tm'))
})

app.put('/assignnewtm', (req, res)=>{
    const {tmName, opptId} = req.body;
    if(tmName){
        db('opportunity')
            .where('opportunityid', '=', opptId)
            .update({
                tendermanager: tmName,
                status:'Exp'
            })
            .then(data => res.json(data))
            .catch(err => res.status(400).json('cant assign a new tm'))
    }

})

app.get('/tmList', (req, res) => {
    db
        .select('tendermanager')
        .distinct('tendermanager')
        .from('opportunity')
        .where({status: 'Exp'})
        .whereNotNull('tendermanager')
        .then(data => {
            res.json(data);
        })
        .catch(err => res.status(400).json('cant get tm list'))
})

app.get('/transferredTenders', (req, res)=>{
    db
        .select('*')
        .from('opportunity')
        .where({status:'Trs'})
        .whereNotNull('team')
        .orderBy('launchdate', 'desc')
        .then(data=>{
            res.json(data)
        })
        .catch(err=>res.status(400).json('cant get trasferred tenders'))
})

app.post('/predictTm', (req, res) => {
    const {tm, category, customer, launchDate, team} = req.body;
    db
        .select('*')
        .from('opportunity')
        .whereNot({'tendermanager':tm})
        .whereNotNull('tendermanager')
        .where({'team': team, 'status':'Exp'})
        .orderBy('launchdate', 'asc')
        .then(data => {
            const filteredByTeam = teams[team].filter(team=>{
                return team['name'] !== tm;
            });
            let filteredByCategory = null;
            if(category === 'Cplt'){
                filteredByCategory = filteredByTeam.filter(member=>{
                    return member['level'] === 'S'
                })
            }else{
                filteredByCategory = filteredByTeam;
            }
            let tms = filteredByCategory.map(tm=>{
                return tm['name']
            })
            const tenderDate = new Date(launchDate);
            tenderDate.setDate(tenderDate.getDate() + 1);

            const filteredDataByTm = data.filter(record=>{
                return tms.includes(record['tendermanager'])
            })

            filteredDataByTm.forEach(row=>{
                const date = row['launchdate']
                date.setDate(date.getDate() + 1)
                if(date.toString() === tenderDate.toString() && tms.includes(row['tendermanager'])){
                    tms = tms.filter(element=>{
                        return element !== row['tendermanager']
                    })
                }
            })
            let freeTms = tms;
            filteredDataByTm.forEach(row=>{
                const date = row['launchdate']
                // date.setDate(date.getDate() + 1)
                if(freeTms.includes(row['tendermanager']) && row['customer'] === customer){
                    freeTms = freeTms.filter(element=>{
                        return element === row['tendermanager']
                    })
                }
            })
            let predictedTm = null;
            if(freeTms.length === 1){
                predictedTm = freeTms[0]
                // console.log(predictedTm)
            }else{
                const no_of_tenders_by_tm = []
                freeTms.forEach(element=>{
                    const tenders = filteredDataByTm.filter(member=>{
                        return member['tendermanager'] === element
                    })
                    no_of_tenders_by_tm.push({tenderManager:element, no_tenders:tenders.length});
                })
                let min_value = no_of_tenders_by_tm[0]['no_tenders'];
                predictedTm = no_of_tenders_by_tm[0]['tenderManager']
                no_of_tenders_by_tm.forEach(element=>{
                    if(element['no_tenders'] < min_value){
                        min_value = element['no_tenders'];
                        predictedTm = element['tenderManager'];
                    }
                })
                console.log(predictedTm)
            }
            res.status(200).json(predictedTm);
            // console.log(freeTms);
        })
        .catch(err => res.status(400).json('prediction failed'))
})

app.listen(process.env.PORT || 3005, () => {
    console.log(`I am listening on port ${process.env.PORT}`)
})