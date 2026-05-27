const mongoose = require("mongoose");

/**
 * Connect to MongoDB using Mongoose.
 * - Reads connection string from process.env.MONGO_URI
 * - Cleans up old/stale indexes to prevent compound index conflicts
 * - Fails fast and exits the process on error
 */
async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("Missing required env var: MONGO_URI");
    process.exit(1);
  }

  try {
    const connection = await mongoose.connect(mongoUri);

    console.log(`MongoDB connected: ${connection.connection.host}`);

    // CLEANUP: Ensure old single-field indexes don't conflict with compound index
    await cleanupProposalIndexes();
  } catch (error) {
    console.error("MongoDB connection failed.");
    console.error(error?.message || error);
    process.exit(1);
  }
}

/**
 * Cleanup stale indexes on the Proposal collection to ensure the compound index works correctly.
 * Removes any conflicting single-field unique indexes that might cause issues.
 */
async function cleanupProposalIndexes() {
  try {
    const Proposal = mongoose.model("Proposal");
    const collection = Proposal.collection;

    // List all existing indexes
    const indexes = await collection.getIndexes();
    console.log("Current Proposal indexes:", Object.keys(indexes));

    // Check for problematic old single-field indexes that might conflict
    const indexesToDrop = [];
    
    for (const [indexName, indexSpec] of Object.entries(indexes)) {
      // Skip the default _id index
      if (indexName === "_id_") continue;

      // Check if this is a single-field unique index on 'gig' or 'freelancer'
      const keyCount = Object.keys(indexSpec.key).length;
      if (
        keyCount === 1 &&
        indexSpec.unique === true &&
        (indexSpec.key.gig === 1 || indexSpec.key.freelancer === 1)
      ) {
        console.warn(
          `Found conflicting single-field unique index: ${indexName}. This conflicts with the compound index.`
        );
        indexesToDrop.push(indexName);
      }
    }

    // Drop conflicting indexes
    if (indexesToDrop.length > 0) {
      for (const indexName of indexesToDrop) {
        try {
          await collection.dropIndex(indexName);
          console.log(`✓ Dropped old index: ${indexName}`);
        } catch (dropError) {
          console.warn(`Could not drop index ${indexName}:`, dropError?.message);
        }
      }
    }

    // Ensure the compound index exists
    await collection.createIndex({ gig: 1, freelancer: 1 }, { unique: true });
    console.log("✓ Compound index { gig: 1, freelancer: 1 } is active and enforced.");
  } catch (error) {
    console.warn("Could not clean up proposal indexes:", error?.message || error);
    // Non-fatal: application can continue even if index cleanup fails
  }
}

module.exports = connectDatabase;

