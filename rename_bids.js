const mongoose = require('mongoose');
const DB_URL = "mongodb+srv://himanshuprasad468:HkIq6d2WlFgsuNO3@cluster0.wku8ob6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to MongoDB for migration");
        const db = mongoose.connection.db;

        const bids = await db.collection('bids').find({}).toArray();
        console.log(`Found ${bids.length} bids. Checking for legacy structure...`);

        let updatedCount = 0;
        for (let bid of bids) {
            let needsUpdate = false;
            let newItems = [];

            if (bid.bidsItems && bid.bidsItems.length > 0) {
                // If it's pure IDs or something that doesn't have .project
                if (!bid.bidsItems[0].project) {
                    needsUpdate = true;
                    for (let itemId of bid.bidsItems) {
                        // Sometimes itemId might be the object or just ID
                        const realId = itemId._id || itemId; 
                        const project = await db.collection('projects').findOne({ _id: realId });
                        newItems.push({
                            project: realId,
                            price: project ? project.price : 0
                        });
                    }
                }
            }

            if (needsUpdate) {
                console.log(`Migrating bid ${bid._id} with ${newItems.length} items.`);
                await db.collection('bids').updateOne(
                    { _id: bid._id },
                    { $set: { bidsItems: newItems } }
                );
                updatedCount++;
            }
        }

        console.log(`Migration finished. Updated ${updatedCount} legacy bids.`);

    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
