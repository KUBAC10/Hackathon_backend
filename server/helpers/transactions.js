import mongoose from 'mongoose';

// init session
async function initSession() {
  return await mongoose.startSession();
}

// init session and start transaction
async function initSessionWithTransaction() {
  const session = await mongoose.startSession();
  session.startTransaction();
  return session;
}

async function commitTransaction(session) {
  if (session) {
    await session.commitTransaction();
    session.endSession();
  }
}

async function abortTransaction(session) {
  if (session && !session.hasEnded) {
    await session.abortTransaction();
    session.endSession();
  }
}

export {
  initSession,
  initSessionWithTransaction,
  abortTransaction,
  commitTransaction
};
