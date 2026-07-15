import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Connects to the MongoDB database using Mongoose.
 * Exits the process with code 1 if the connection fails.
 */
const connectDB = async () => {
  try {
    // Attempt to connect to the database URI from the environment variables
    const conn = await mongoose.connect(process.env.MONGODB_URI, {

    });

    console.log(`MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error);
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;
