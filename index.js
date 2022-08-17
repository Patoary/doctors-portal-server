const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 4000;


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.69vola1.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect()
        const servicesCollection = client.db('doctors_portal').collection('services');
        const bookingCollection = client.db('doctors_portal').collection('bookings');
        const userCollection = client.db('doctors_portal').collection('users');

        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        app.put('/user/:email', async(req, res)=>{
            const email = req.body.email;
            const user = req.body;
            const filter = {email: email};
            const options ={upsert: true};
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter,updateDoc,options);
            res.send(result);
        })

        // Warning:
        //This is not the proper way to query.
        //After learning more about mongodb. use aggregate lookup, pipeline, match, group

        app.get('/available', async (req, res) => {
            const date = req.query.date;

            // step 1: get all services

            const services = await servicesCollection.find().toArray();

            // step :2 get the booking of the day
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            // step 3: for each service, find bookings for that service
            services.forEach(service => {
                // step 4: find bookings for the service. output: [{}, {}]
                const serviceBooking = bookings.filter(book => book.treatment === service.name);
                // step 5: select slots for the service Bookings: ['', '','']
                const bookedSlots = serviceBooking.map(book => book.slot);
                // step 6: select those slots that are not in bookedSlots
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));
                // step 7: set available to slots to make it easier
                service.slots = available;
            })

            // services.forEach(service => {
            //     const serveceBookings = bookings.filter(b => b.treatment === service.name);
            //     const booked = serveceBookings.map(s => s.slot);
            //     const available = service.slots.filter(s => !booked.includes(s));
            //     service.available = available;
            // })

            res.send(services);
        });

        app.get('/booking', async (req, res) => {
            const patient = req.query.patient;
            const query = { patient: patient };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings)
        })

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const resutl = await bookingCollection.insertOne(booking);
            return res.send({ success: true, resutl });
        });

    }
    finally {

    }

}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Welcome to doctors portal')
})
app.listen(port, () => {
    console.log(`Doctors Portal listening on port ${port}`)
})